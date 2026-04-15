/** @registry */
import type { FC, ReactNode } from "react";

import type { TabsProps } from "@nextgisweb/gui/antd";
import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

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

interface PanelPluginBase {
  name: string;
  title: string;
  icon: ReactNode;
  desktopOnly?: boolean;
  order?: number;
  applyToTinyMap?: boolean;
  placement?: "start" | "end";

  isEnabled?: ({
    config,
  }: {
    config: DisplayConfig;
  }) => boolean | Promise<boolean>;
  startup?: (display: Display) => Promise<void>;
}

export interface WidgetPanelPlugin<
  S extends PanelStore = PanelStore,
> extends PanelPluginBase {
  type: "widget";
  widget: PanelPluginWidget<S>;
  store?: PanelPluginStore<S>;
  tab?: Omit<Tab, "key" | "label">;
}

export interface LinkPanelPlugin extends PanelPluginBase {
  type: "link";
  href: string;
  target?: "_blank" | "_self";
}

export interface ActionPanelPlugin extends PanelPluginBase {
  type: "action";
  action: (val: { display: Display }) => void | Promise<void>;
}

export type PanelPlugin<S extends PanelStore = PanelStore> =
  | WidgetPanelPlugin<S>
  | LinkPanelPlugin
  | ActionPanelPlugin;

export const registry = pluginRegistry<PanelPlugin>(MODULE_NAME);

export function panelRegistry<S extends PanelStore>(
  compId: string,
  plugin: PanelPlugin<S>
) {
  registry.register(compId, plugin as unknown as PanelPlugin<PanelStore>);
}
