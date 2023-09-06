/** @registry jsrealm/testentry/driver */
import { PluginRegistry } from "../../plugin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginType = (module: any, el: HTMLElement) => void;
export interface PluginMeta {
    identity: string;
}

export const registry = new PluginRegistry<PluginType, PluginMeta>(
    "jsrealm/testentry/driver"
);
