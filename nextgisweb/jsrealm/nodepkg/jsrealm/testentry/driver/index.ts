/** @registry jsrealm/testentry/driver */
import { PluginRegistry } from "../../plugin";

export type PluginType = (module: string, el: HTMLElement) => void;
export interface PluginMeta {
    identity: string;
}

export const registry = new PluginRegistry<PluginType, PluginMeta>(
    "jsrealm/testentry/driver"
);

registry.register({
    component: "jsrealm",
    identity: "mocha",
    import: () => import("./mocha"),
});
