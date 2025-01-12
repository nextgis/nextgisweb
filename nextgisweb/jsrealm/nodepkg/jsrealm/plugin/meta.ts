/** @registry */
import { loaderRegistry } from "./loader";
import type { BaseRegistry } from "./registry";

/** Registry of all registries for testing purposes */
export const registry = loaderRegistry<
    BaseRegistry<unknown, NonNullable<unknown>>,
    { identity: string }
>(MODULE_NAME);
