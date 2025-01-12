/** @registry */
import { loaderRegistry } from "../../plugin";

export const registry = loaderRegistry<
    (module: string, el: HTMLElement) => void,
    { identity: string }
>(MODULE_NAME);

registry.registerLoader(COMP_ID, () => import("./mocha"), {
    identity: "mocha",
});
