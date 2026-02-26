import { route } from "@nextgisweb/pyramid/api";

import { resourceAttrItem } from "../api/resource-attr";

interface LoadParentsOptions {
    signal?: AbortSignal;
    cache?: boolean;
}

export async function loadParents(
    resourceId: number,
    { signal, cache }: LoadParentsOptions
): Promise<number[]> {
    const resp = await resourceAttrItem({
        resource: resourceId,
        attributes: [["resource.parents"]],
        route: route("resource.attr"),
        signal,
        cache,
    });
    const parents = resp.get("resource.parents") ?? [];

    return parents.map((item) => item.id);
}
