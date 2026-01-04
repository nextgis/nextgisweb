import type { PyramidSettingsResponseTyped } from "@nextgisweb/pyramid/type/api";

import { route } from "./api";

type CSTypedComponent = PyramidSettingsResponseTyped["component"];

async function fetchSettings<C extends CSTypedComponent>(
    component: C
): Promise<PyramidSettingsResponseTyped & { component: C }>;

async function fetchSettings<T>(component: string): Promise<T>;

async function fetchSettings(component: string) {
    return await route("pyramid.settings").get({
        query: { component: component as any },
        cache: true,
    });
}

export { fetchSettings };
