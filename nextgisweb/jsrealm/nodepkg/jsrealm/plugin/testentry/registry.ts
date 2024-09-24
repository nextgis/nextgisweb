/** @registry */
import { pluginRegistry } from "../registry";

export type Operation = "create" | "update" | "delete";

export const registry = pluginRegistry<
    (what: string) => string,
    { operation: Operation }
>(MODULE_NAME);

registry.register(COMP_ID, () => import("./plugin/foo"), {
    operation: "create",
});
