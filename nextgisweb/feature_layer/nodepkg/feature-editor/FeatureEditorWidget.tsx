import { observer } from "mobx-react-lite";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Tabs } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component/SaveButton";
import { ErrorModal } from "@nextgisweb/gui/error/ErrorModal";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { useUnsavedChanges } from "@nextgisweb/gui/hook";
import showModal from "@nextgisweb/gui/showModal";
import type { ParamOf } from "@nextgisweb/gui/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FeatureEditorStore } from "./FeatureEditorStore";
import { TabLabel } from "./component/TabLabel";
import { ATTRIBUTES_KEY } from "./constant";
import { registry } from "./registry";
import type { FeatureEditorPlugin } from "./registry";
import type { FeatureEditorWidgetProps } from "./type";

import ResetIcon from "@nextgisweb/icon/material/restart_alt";
import "./FeatureEditorWidget.less";

type TabItem = NonNullable<ParamOf<typeof Tabs, "items">>[0] & {
    order?: number;
};

const msgLoading = gettext("Loading...");
const msgSave = gettext("Save");
const msgOk = gettext("OK");
const msgReset = gettext("Reset");

export const FeatureEditorWidget = observer(
    ({
        resourceId,
        featureId,
        okBtnMsg = msgOk,
        toolbar,
        store: storeProp,
        mode = "save",
        onOk,
        onSave,
    }: FeatureEditorWidgetProps) => {
        const [activeKey, setActiveKey] = useState(ATTRIBUTES_KEY);
        const store = useState<FeatureEditorStore>(() => {
            if (storeProp) return storeProp;
            if (resourceId && featureId)
                return new FeatureEditorStore({ resourceId, featureId });
            throw new Error(
                "Either 'store' should be provided or both 'resourceId' and 'featureId'"
            );
        })[0];

        const [items, setItems] = useState<TabItem[]>([]);

        const createEditorTab = useCallback(
            async (newEditorWidget: FeatureEditorPlugin) => {
                const key = newEditorWidget.identity;
                const Store = await newEditorWidget.store();
                const widgetStore = new Store.default({
                    parentStore: store,
                });

                if (key !== ATTRIBUTES_KEY) {
                    store.addExtensionStore(key, widgetStore);
                } else {
                    store.attachAttributeStore(widgetStore);
                }

                const Widget = lazy(async () => await newEditorWidget.widget());

                const ObserverTableLabel = observer(() => (
                    <TabLabel
                        counter={widgetStore.counter}
                        dirty={widgetStore.dirty}
                        label={newEditorWidget.label}
                    />
                ));
                ObserverTableLabel.displayName = "ObserverTableLabel";

                return {
                    key,
                    order: newEditorWidget.order,
                    label: <ObserverTableLabel />,
                    children: (
                        <Suspense fallback={msgLoading}>
                            <Widget store={widgetStore}></Widget>
                        </Suspense>
                    ),
                };
            },
            [store]
        );

        useEffect(() => {
            const loadWidgets = async () => {
                const newTabs = await Promise.all(
                    registry.queryAll().map(createEditorTab)
                );
                newTabs.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
                setItems(newTabs);
            };

            loadWidgets();
        }, [store, createEditorTab]);

        useUnsavedChanges({ dirty: store.dirty });

        const actions: ActionToolbarAction[] = [
            <SaveButton
                disabled={!store.dirty}
                key="save"
                loading={store.saving}
                onClick={async () => {
                    if (mode === "save") {
                        try {
                            const res = await store.save();
                            if (onSave) {
                                onSave(res);
                            }
                        } catch (error) {
                            showModal(ErrorModal, { error: error as ApiError });
                        }
                    } else if (onOk) {
                        onOk(store.preparePayload());
                    }
                }}
            >
                {mode === "save" ? msgSave : okBtnMsg}
            </SaveButton>,
        ];
        const rightActions: ActionToolbarAction[] = [];
        if (store.dirty) {
            rightActions.push(
                <Button
                    key="reset"
                    onClick={() => {
                        store.reset();
                    }}
                    icon={<ResetIcon />}
                >
                    {msgReset}
                </Button>
            );
        }

        const toolbarProps: Partial<ActionToolbarProps> = { ...toolbar };
        toolbarProps.actions = [...actions, ...(toolbarProps.actions || [])];
        toolbarProps.rightActions = [
            ...rightActions,
            ...(toolbarProps.rightActions || []),
        ];

        return (
            <div className="ngw-feature-layer-editor">
                <Tabs
                    type="card"
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={items}
                    parentHeight
                />
                <ActionToolbar {...toolbarProps} />
            </div>
        );
    }
);

FeatureEditorWidget.displayName = "FeatureEditorWidget";
