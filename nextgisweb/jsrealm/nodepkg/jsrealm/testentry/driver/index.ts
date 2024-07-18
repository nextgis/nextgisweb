/** @registry */
import { pluginRegistry } from "../../plugin";

export const registry = pluginRegistry<
    (module: string, el: HTMLElement) => void,
    { identity: string }
>(MODULE_NAME);

registry.register(
    { component: COMP_ID, identity: "mocha" },
    { import: () => import("./mocha") }
);
