/** @registry */
import { loaderRegistry } from "../loader";

export type Operation = "create" | "update" | "delete";

export const registry = loaderRegistry<
    (what: string) => string,
    { operation: Operation }
>(MODULE_NAME);

registry.registerLoader(COMP_ID, () => import("./plugin/foo"), {
    operation: "create",
});
