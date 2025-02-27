import type { Entrypoint } from "@nextgisweb/webmap/type";

export async function entrypointsLoader(entrypoints: Entrypoint[]) {
    const mods = await Promise.all(
        entrypoints.map(async (m) => {
            if (Array.isArray(m)) {
                const mod = await m[1]();
                return [m[0], mod.default];
            } else {
                const mod = await ngwEntry<{ default: unknown }>(m);
                return [m, mod.default];
            }
        })
    );
    const obj = Object.fromEntries(mods);
    return obj;
}
