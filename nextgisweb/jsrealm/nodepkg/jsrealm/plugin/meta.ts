/** @registry */
import { pluginRegistry } from "./registry";
import type { PluginRegistry } from "./registry";

export const registry = pluginRegistry<PluginRegistry, { identity: string }>(
    MODULE_NAME
);
