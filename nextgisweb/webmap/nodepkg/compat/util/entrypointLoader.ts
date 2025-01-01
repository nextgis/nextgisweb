import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import type { Entrypoint } from "@nextgisweb/webmap/type";

export function entrypointsLoader(entrypoints: Entrypoint[]) {
    return Promise.all(
        entrypoints.map((m) => {
            if (Array.isArray(m)) {
                return m[1]().then((mod) => {
                    return [m[0], mod.default];
                });
            } else {
                return entrypoint<{ default: unknown }>(m).then((mod) => {
                    return [m, mod.default];
                });
            }
        })
    ).then((mods) => {
        const obj = Object.fromEntries(mods);
        return obj;
    });
}
