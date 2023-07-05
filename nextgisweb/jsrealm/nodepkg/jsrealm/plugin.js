/** @entrypoint */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";

// eslint-disable-next-line no-undef
export const REGISTRY = JSREALM_PLUGIN_REGISTRY;

export async function loadPlugin(category, key) {
    return await entrypoint(REGISTRY[category][key]);
}

export function load(path, require, ready) {
    const [category, key] = path.split("/", 2);
    loadPlugin(category, key).then(({ default: module }) => {
        ready(module);
    }, console.error);
}
