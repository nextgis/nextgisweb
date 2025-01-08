/** @registry */
import { pluginRegistry } from "../../plugin";

export const registry = pluginRegistry<
    (module: string, el: HTMLElement) => void,
    { identity: string }
>(MODULE_NAME);

registry.registerLoader(COMP_ID, () => import("./mocha"), {
    identity: "mocha",
});
