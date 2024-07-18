/** @registry */
import { pluginRegistry } from "../registry";

export const registry = pluginRegistry<
    (what: string) => string,
    { operation: "create" | "update" | "delete" }
>(MODULE_NAME);

registry.register(
    { component: COMP_ID, operation: "create" },
    { import: () => import("./plugin/foo") }
);
