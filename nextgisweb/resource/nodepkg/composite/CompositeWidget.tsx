import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type { ActionToolbarProps } from "@nextgisweb/gui/action-toolbar";
import { Tabs } from "@nextgisweb/gui/antd";
import type { ParamOf } from "@nextgisweb/gui/type";
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type/EditorStore";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type {
    EditorWidgetComponent,
    EditorWidgetProps,
    Operation,
} from "../type";

import { CompositeStore } from "./CompositeStore";

interface CompositeWidgetProps {
    cls: ResourceCls;
    operation: Operation;
    parent: number;
}

interface WidgetEntryPoint<S extends EditorStore = EditorStore> {
    store: new (args: EditorStoreOptions) => S;
    widget: EditorWidgetComponent<EditorWidgetProps<S>>;
}
interface WidgetModule<S extends EditorStore = EditorStore> {
    store: S;
    widget: EditorWidgetComponent<EditorWidgetProps<S>>;
}

type TabItem = NonNullable<ParamOf<typeof Tabs, "items">>[0] & {
    order?: number;
};

const CompositeWidget = observer(
    ({ cls, operation, parent }: CompositeWidgetProps) => {
        const [activeKey, setActiveKey] = useState<string>();
        const [composite, setComposite] = useState<CompositeStore>();
        const [modules, setModules] = useState<WidgetModule[]>();
        const { data } = useRouteGet({
            name: "resource.widget",
            options: {
                query: { cls, operation, parent },
            },
        });

        const items = useMemo<TabItem[]>(() => {
            if (modules) {
                return modules
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
        }, [modules]);

        const toolbarProps: Partial<ActionToolbarProps> = {};

        useEffect(() => {
            if (data) {
                const composite = new CompositeStore(data);
                setComposite(composite);
                const loadWidgets = async () => {
                    const modules: WidgetModule[] = [];

                    for (const [moduleName, params] of Object.entries(
                        data.config
                    )) {
                        const module =
                            await entrypoint<WidgetEntryPoint>(moduleName);
                        const widgetStore = new module.store({
                            composite,
                            operation,
                        });
                        modules.push({ ...module, store: widgetStore });
                    }
                    setModules(modules);
                };

                loadWidgets();
            }
        }, [data, operation]);

        return (
            <>
                <Tabs
                    type="card"
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    items={items}
                    parentHeight
                />
                <ActionToolbar {...toolbarProps} />
            </>
        );
    }
);

CompositeWidget.displayName = "CompositeWidget";

export default CompositeWidget;
