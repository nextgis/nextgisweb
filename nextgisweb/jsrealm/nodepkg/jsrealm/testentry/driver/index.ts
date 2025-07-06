/** @registry */
import { loaderRegistry } from "../../plugin";
import type { ImportCallback } from "../../plugin";

export const registry = loaderRegistry<
    (value: any, element: HTMLElement) => void,
    { identity: string }
>(MODULE_NAME);

registry.registerLoader(COMP_ID, () => import("./mocha"), {
    identity: "mocha",
});

export interface DriverValue {
    mocha: ImportCallback<(...args: []) => void>;
}
