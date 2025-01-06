/** @registry */
import { reaction } from "mobx";
import type { ComponentType } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type {
    Plugin,
    PluginObject,
    RegisterValue,
} from "@nextgisweb/jsrealm/plugin/registry";

import type { PanelMeta } from "../type";

import type { PanelComponentProps } from "./type";

export type PanelWidget<T = unknown> = ComponentType<PanelComponentProps<T>>;

export type PanelPlugin<T = unknown> = Plugin<PanelWidget<T>, PanelMeta<T>>;

export const registry = pluginRegistry<PanelWidget<any>, PanelMeta<any>>(
    MODULE_NAME
);

export function createPanelRegistry<T = unknown>(
    component: string,
    value: RegisterValue<PanelWidget<T>>,
    meta?: PanelMeta<Partial<T>> & {
        isEnabled?: (val: PanelMeta<T>) => boolean;
        beforeCreate?: (
            val: PluginObject<PanelWidget<T>, PanelMeta<Partial<T>>>
        ) => void;
    }
) {
    const { isEnabled, beforeCreate, ...rest } = meta || {};

    const plugin = registry.register(component, value, rest);
    let beforeCreateExecuted = false;
    if (plugin) {
        reaction(
            () => plugin.meta,
            () => {
                const curEnadled = plugin.meta.enabled;
                let enabled = curEnadled;
                if (isEnabled) {
                    enabled = isEnabled(plugin.meta);
                    if (curEnadled !== enabled) {
                        plugin.updateMeta({ enabled });
                    }
                }
                if (enabled && beforeCreate && !beforeCreateExecuted) {
                    beforeCreateExecuted = true;
                    beforeCreate(plugin);
                }
            },
            {
                fireImmediately: true,
            }
        );
    }

    return plugin;
}
