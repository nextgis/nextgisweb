import { observer } from "mobx-react-lite";
import {
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Tabs, message } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import { TabsLabelBadge } from "@nextgisweb/gui/component";
import { SaveButton } from "@nextgisweb/gui/component/SaveButton";
import { errorModal } from "@nextgisweb/gui/error";
import { useUnsavedChanges } from "@nextgisweb/gui/hook";
import { assert } from "@nextgisweb/jsrealm/error";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FeatureEditorStore } from "./FeatureEditorStore";
import { ATTRIBUTES_KEY } from "./constant";
import { registry } from "./registry";
import type { FeatureEditorPlugin } from "./registry";
import type { FeatureEditorWidgetProps } from "./type";

import ResetIcon from "@nextgisweb/icon/material/restart_alt";
import "./FeatureEditorWidget.less";

type TabItem = NonNullable<TabsProps["items"]>[number] & {
    order?: number;
};

const msgLoading = gettext("Loading...");
const msgSave = gettext("Save");
const msgOk = gettext("OK");
const msgReset = gettext("Reset");

const msgSaved = gettext("Feature saved");
const msgNoChanges = gettext("No changes to save");

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
        const [messageApi, contextHolder] = message.useMessage();
        const [activeKey, setActiveKey] = useState(ATTRIBUTES_KEY);
        const store = useState<FeatureEditorStore>(() => {
            if (storeProp) return storeProp;
            assert(resourceId && featureId);
            return new FeatureEditorStore({ resourceId, featureId });
        })[0];

        const { dirty, saving } = store;

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

                const TabsLabelObserver = observer(() => (
                    <TabsLabelBadge
                        counter={widgetStore.counter ?? undefined}
                        dirty={widgetStore.dirty}
                    >
                        {newEditorWidget.label}
                    </TabsLabelBadge>
                ));

                TabsLabelObserver.displayName = "TabsLabelObserver";

                return {
                    key,
                    order: newEditorWidget.order,
                    label: <TabsLabelObserver />,
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

        const onSaveClick = useCallback(async () => {
            if (mode === "save") {
                try {
                    if (!dirty) {
                        messageApi.success({ content: msgNoChanges });
                        return;
                    }
                    const res = await store.save();
                    if (res) {
                        messageApi.success({ content: msgSaved });
                        if (onSave) {
                            onSave(res);
                        }
                    }
                } catch (err) {
                    errorModal(err);
                }
            } else if (onOk) {
                onOk(store.preparePayload());
            }
        }, [dirty, messageApi, mode, onOk, onSave, store]);

        useUnsavedChanges({ dirty });

        const toolbarProps: Partial<ActionToolbarProps> = useMemo(() => {
            const actions: ActionToolbarAction[] = [
                <SaveButton
                    disabled={!dirty}
                    key="save"
                    loading={saving}
                    onClick={onSaveClick}
                >
                    {mode === "save" ? msgSave : okBtnMsg}
                </SaveButton>,
            ];
            const rightActions: ActionToolbarAction[] = [];
            if (dirty) {
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

            return {
                ...toolbar,
                actions: [...actions, ...(toolbar?.actions || [])],
                rightActions: [
                    ...rightActions,
                    ...(toolbar?.rightActions || []),
                ],
            };
        }, [dirty, saving, onSaveClick, mode, okBtnMsg, toolbar, store]);

        return (
            <div className="ngw-feature-layer-editor">
                <Tabs
                    type="card"
                    size="large"
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={items}
                    parentHeight
                />
                <ActionToolbar {...toolbarProps} />
                {contextHolder}
            </div>
        );
    }
);

FeatureEditorWidget.displayName = "FeatureEditorWidget";
