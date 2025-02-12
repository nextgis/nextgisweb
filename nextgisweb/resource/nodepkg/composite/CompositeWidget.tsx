import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Tabs } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component";
import type { ParamOf } from "@nextgisweb/gui/type";
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type/EditorStore";
import type {
    ResourceCls,
    ResourceWidget,
} from "@nextgisweb/resource/type/api";

import type {
    EditorWidgetComponent,
    EditorWidgetProps,
    Operation,
} from "../type";

import { CompositeStore } from "./CompositeStore";

import "./CompositeWidget.less";

interface CompositeWidgetProps {
    cls: ResourceCls;
    operation: Operation;
    parent: number;
}

interface WidgetEntrypoint<S extends EditorStore = EditorStore> {
    store: new (args: EditorStoreOptions) => S;
    widget: EditorWidgetComponent<EditorWidgetProps<S>>;
}
interface WidgetMember<S extends EditorStore = EditorStore> {
    store: S;
    widget: EditorWidgetComponent<EditorWidgetProps<S>>;
}

type TabItem = NonNullable<ParamOf<typeof Tabs, "items">>[0] & {
    order?: number;
};

const operationMsg: Record<ResourceWidget["operation"], string> = {
    create: gettext("Create"),
    update: gettext("Save"),
    delete: gettext("Delete"),
};

const CompositeWidget = observer(
    ({ cls, operation, parent }: CompositeWidgetProps) => {
        const [activeKey, setActiveKey] = useState<string>();
        const [composite, setComposite] = useState<CompositeStore>();
        const [members, setMembers] = useState<WidgetMember[]>();
        const { data } = useRouteGet({
            name: "resource.widget",
            options: {
                query: { cls, operation, parent },
            },
        });

        const items = useMemo<TabItem[]>(() => {
            if (members) {
                return members
                    .map(({ store, widget: Widget }) => {
                        return {
                            key: Widget.title || "Widget",
                            order: Widget.order,
                            label: Widget.title,
                            children: <Widget store={store}></Widget>,
                        };
                    })
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            }
            return [];
        }, [members]);

        // const toolbarProps: Partial<ActionToolbarProps> = useMemo(() => {
        //     const props: ActionToolbarProps = {
        //         actions: [{}],
        //     };

        //     return props;
        // }, []);

        const toolbarProps: Partial<ActionToolbarProps> = useMemo(() => {
            const actions: ActionToolbarAction[] = [
                <SaveButton
                    // disabled={!dirty}
                    key="save"
                    // loading={store.saving}
                    onClick={async () => {
                        if (operation === "create") {
                            // try {
                            //     const res = await composite.save();
                            //     if (onSave) {
                            //         onSave(res);
                            //     }
                            // } catch (error) {
                            //     errorModal(error);
                            // }
                        } else if (operation === "update") {
                            //
                        } else if (operation === "delete") {
                            //
                        }
                    }}
                >
                    {operationMsg[operation]}
                </SaveButton>,
            ];
            const rightActions: ActionToolbarAction[] = [];

            return {
                actions,
                rightActions,
            };
        }, [operation]);

        useEffect(() => {
            if (data) {
                const composite = new CompositeStore(data);
                setComposite(composite);
                const loadWidgets = async () => {
                    const modules: WidgetMember[] = [];

                    for (const [moduleName, params] of Object.entries(
                        data.config
                    )) {
                        const module =
                            await entrypoint<WidgetEntrypoint>(moduleName);
                        const widgetStore = new module.store({
                            composite,
                            operation,
                            ...params,
                        });
                        modules.push({ ...module, store: widgetStore });
                    }
                    setMembers(modules);
                };

                loadWidgets();
            }
        }, [data, operation]);

        return (
            <div className="ngw-resource-composite">
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

CompositeWidget.displayName = "CompositeWidget";

export default CompositeWidget;
