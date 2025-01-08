/** @registry */
import type { FunctionComponent, ReactNode } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { Plugin } from "@nextgisweb/jsrealm/plugin/registry";

import type { Display } from "../display";

import type { PanelStore } from "./PanelStore";

export type PanelWidget<S extends PanelStore = PanelStore> = FunctionComponent<{
    store: S;
    display: Display;
}>;

export interface PanelMeta {
    name: string;
    title: string;
    icon: ReactNode;
    order: number;
    applyToTinyMap?: boolean;

    storeClass?: typeof PanelStore;
    isEnabled?: ({ config }: { config: Display["config"] }) => boolean;
    startup?: (display: Display) => Promise<void>;
}

export type PanelPlugin = Plugin<PanelWidget, PanelMeta>;

export const registry = pluginRegistry<PanelWidget, PanelMeta>(MODULE_NAME);
