/** @registry jsrealm/plugin/testentry */
import { PluginRegistry } from "../registry";

export type PluginType = (what: string) => string;
export interface MetadataType {
    readonly operation: "create" | "update" | "delete";
}
export const registry = new PluginRegistry<PluginType, MetadataType>(
    "jsrealm/plugin/testentry"
);

registry.register({
    component: "jsrealm",
    operation: "create",
    import: () => import("./plugin/foo"),
});
