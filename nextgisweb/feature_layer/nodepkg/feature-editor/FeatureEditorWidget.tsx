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
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!feature_layer";

import editorWidgetRegister from "../attribute-editor";
import type { EditorWidgetRegister } from "../type";

import { FeatureEditorStore } from "./FeatureEditorStore";
import { TabLabel } from "./component/TabLabel";
import type { FeatureEditorWidgetProps } from "./type";

import ResetIcon from "@nextgisweb/icon/material/restart_alt";
import "./FeatureEditorWidget.less";

type TabItems = NonNullable<ParamOf<typeof Tabs, "items">>;
type TabItem = TabItems[0];

const msgLoading = gettext("Loading...");
const msgSave = gettext("Save");
const msgReset = gettext("Reset");

const ATTRIBUTES = "attributes";

export const FeatureEditorWidget = observer(
    ({
        resourceId,
        featureId,
        toolbar,
        onSave,
        store: storeProp,
    }: FeatureEditorWidgetProps) => {
        const [activeKey, setActiveKey] = useState(ATTRIBUTES);
        const store = useState<FeatureEditorStore>(() => {
            if (storeProp) return storeProp;
            if (resourceId && featureId)
                return new FeatureEditorStore({ resourceId, featureId });
            throw new Error(
                "Either 'store' should be provided or both 'resourceId' and 'featureId'"
            );
        })[0];

        const [items, setItems] = useState<TabItems>([]);

        const registerEditorWidget = useCallback(
            (key: string, newEditorWidget: EditorWidgetRegister) => {
                const widgetStore = new newEditorWidget.store({
                    parentStore: store,
                });

                const Widget = lazy(
                    async () => await newEditorWidget.component()
                );

                const ObserverTableLabel = observer(() => (
                    <TabLabel
                        counter={widgetStore.counter}
                        dirty={widgetStore.dirty}
                        label={newEditorWidget.label}
                    />
                ));

                const newWidget: TabItem = {
                    key,
                    label: <ObserverTableLabel />,
                    children: (
                        <Suspense fallback={msgLoading}>
                            <Widget store={widgetStore}></Widget>
                        </Suspense>
                    ),
                };
                setItems((old) => [...old, newWidget]);
                return { widgetStore };
            },
            [store]
        );

        useEffect(() => {
            const loadWidgets = async () => {
                let key: keyof typeof settings.editor_widget;
                for (key in settings.editor_widget) {
                    const mid = settings.editor_widget[key];
                    try {
                        const widgetResource = (
                            await entrypoint<{ default: EditorWidgetRegister }>(
                                mid
                            )
                        ).default;
                        const { widgetStore } = registerEditorWidget(
                            key,
                            widgetResource
                        );
                        store.addExtensionStore(key, widgetStore);
                    } catch (er) {
                        console.error(er);
                    }
                }
            };

            const { widgetStore } = registerEditorWidget(
                ATTRIBUTES,
                editorWidgetRegister as unknown as EditorWidgetRegister
            );
            store.attachAttributeStore(widgetStore);

            loadWidgets();
        }, [store, registerEditorWidget]);

        useUnsavedChanges({ dirty: store.dirty });

        const actions: ActionToolbarAction[] = [
            <SaveButton
                disabled={!store.dirty}
                key="save"
                loading={store.saving}
                onClick={async () => {
                    try {
                        const res = await store.save();
                        if (onSave) {
                            onSave(res);
                        }
                    } catch (error) {
                        showModal(ErrorModal, { error: error as ApiError });
                    }
                }}
            >
                {msgSave}
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
