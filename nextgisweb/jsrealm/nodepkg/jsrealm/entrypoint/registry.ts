/** @registry */
import { pluginRegistry } from "../plugin";

interface Entrypoint {
    identity: string;
    value: (...args: []) => Promise<unknown>;
}

export const registry = pluginRegistry<Entrypoint>(MODULE_NAME);
