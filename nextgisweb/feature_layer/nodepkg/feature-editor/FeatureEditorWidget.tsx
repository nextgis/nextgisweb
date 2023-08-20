import { observer } from "mobx-react-lite";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Badge, Button, Space, Tabs } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component/SaveButton";
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!feature_layer";

import editorWidgetRegister from "../attribute-editor";
import { FeatureEditorStore } from "./FeatureEditorStore";

import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import type { ParamOf } from "@nextgisweb/gui/type";
import type { EditorWidgetRegister } from "../type";
import type { FeatureEditorWidgetProps } from "./type";

import CircleIcon from "@nextgisweb/icon/material/circle";
import ResetIcon from "@nextgisweb/icon/material/restart_alt";

import "./FeatureEditorWidget.less";

type TabItems = NonNullable<ParamOf<typeof Tabs, "items">>;
type TabItem = TabItems[0];

const mLoading = gettext("Loading...");
const saveText = gettext("Save");
const resetText = gettext("Reset");

export const FeatureEditorWidget = observer(
    ({ resourceId, featureId }: FeatureEditorWidgetProps) => {
        const [store] = useState(
            () => new FeatureEditorStore({ resourceId, featureId })
        );

        const [items, setItems] = useState<TabItems>([]);

        const registerEditorWidget = useCallback(
            (key: string, newEditorWidget: EditorWidgetRegister) => {
                const widgetStore = new newEditorWidget.store({
                    parentStore: store,
                });

                const Widget = lazy(
                    async () => await newEditorWidget.component()
                );

                const DirtyMark = observer(() => {
                    // We can add revert all changes of the tab via reset(),
                    // but it should not fire on regular tab clicks.
                    return (
                        (widgetStore.dirty && (
                            <CircleIcon style={{ color: "var(--primary)" }} />
                        )) ||
                        null
                    );
                });

                const TabLabel = observer(() => {
                    return (
                        <Space>
                            {newEditorWidget.label}
                            {(widgetStore.counter && (
                                <Badge
                                    count={widgetStore.counter}
                                    color={
                                        widgetStore.dirty
                                            ? "var(--primary)"
                                            : "var(--text-secondary)"
                                    }
                                    size="small"
                                />
                            )) || <DirtyMark />}
                        </Space>
                    );
                });

                const newWidget: TabItem = {
                    key,
                    label: <TabLabel />,
                    children: (
                        <Suspense fallback={mLoading}>
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
                "attributes",
                editorWidgetRegister as unknown as EditorWidgetRegister
            );
            store.attachAttributeStore(widgetStore);

            loadWidgets();
        }, [store, registerEditorWidget]);

        useEffect(() => {
            const alertUnsaved = (event: BeforeUnloadEvent) => {
                if (store.dirty) {
                    event.preventDefault();
                    event.returnValue = "";
                }
            };

            window.addEventListener("beforeunload", alertUnsaved);

            return () => {
                window.removeEventListener("beforeunload", alertUnsaved);
            };
        }, [store.dirty]);

        const actions: ActionToolbarAction[] = [
            <SaveButton
                disabled={!store.dirty}
                key="save"
                loading={store.saving}
                onClick={store.save}
            >
                {saveText}
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
                    {resetText}
                </Button>
            );
        }

        return (
            <div className="ngw-feature-layer-editor">
                <Tabs type="card" items={items} parentHeight />
                <ActionToolbar actions={actions} rightActions={rightActions} />
            </div>
        );
    }
);
