import { route } from "@nextgisweb/pyramid/api";

import type { ResourceItem, Resource } from "../type/Resource";

interface LoadParentsOptions {
    signal?: AbortSignal;
    cache?: boolean;
}

export async function loadParents(resourceId: number, { signal, cache = true }: LoadParentsOptions): Promise<ResourceItem[]> {
    const parents: ResourceItem[] = [];
    let parentIdOrNull: number | null | Resource['parent'] = resourceId;
    while (typeof parentIdOrNull === "number") {
        const resourceItem = await route("resource.item", {
            id: parentIdOrNull,
        }).get({
            signal,
            cache,
        }) as ResourceItem;
        parents.push(resourceItem);
        parentIdOrNull = resourceItem.resource.parent;
        if (parentIdOrNull && typeof parentIdOrNull !== 'number') {
            parentIdOrNull = parentIdOrNull.id;
        }
    }
    return parents.reverse();
}
