/** @registry */
import type { TabsProps } from "rc-tabs";
import type { FC, ReactNode } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";

import type { Display } from "../display";
import type {
    PanelStore,
    PanelStoreConstructorOptions,
} from "../panel/PanelStore";

type Tab = NonNullable<TabsProps["items"]>[number];

export interface PanelPluginWidgetProps<S extends PanelStore = PanelStore> {
    store: S;
    display: Display;
}

export type PanelPluginWidget<S extends PanelStore = PanelStore> =
    ImportCallback<FC<PanelPluginWidgetProps<S>>>;

export type PanelPluginStore<S extends PanelStore = PanelStore> =
    ImportCallback<new (options: PanelStoreConstructorOptions) => S>;

export interface PanelPlugin<S extends PanelStore = PanelStore> {
    widget: PanelPluginWidget<S>;
    store?: PanelPluginStore<S>;

    name: string;
    title: string;
    icon: ReactNode;
    desktopOnly?: boolean;
    order?: number;
    applyToTinyMap?: boolean;

    tab?: Omit<Tab, "key" | "label">;

    isEnabled?: ({ config }: { config: Display["config"] }) => boolean;
    startup?: (display: Display) => Promise<void>;
}

export const registry = pluginRegistry<PanelPlugin>(MODULE_NAME);

export function panelRegistry<S extends PanelStore>(
    compId: string,
    plugin: PanelPlugin<S>
) {
    registry.register(compId, plugin as unknown as PanelPlugin<PanelStore>);
}
