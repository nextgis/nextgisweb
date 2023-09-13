/** @registry jsrealm/plugin/meta */
import { PluginRegistry } from "./registry";

type PluginType = PluginRegistry<never, never>;
interface MetadataType {
    readonly identity: string;
}
export const registry = new PluginRegistry<PluginType, MetadataType>(
    "jsrealm/plugin/meta"
);
