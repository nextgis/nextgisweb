import { route } from "@nextgisweb/pyramid/api";
import type {
    CompositeRead,
    ResourceRefWithParent,
} from "@nextgisweb/resource/type/api";

interface LoadParentsOptions {
    signal?: AbortSignal;
    cache?: boolean;
}

export async function loadParents(
    resourceId: number,
    { signal, cache = true }: LoadParentsOptions
): Promise<CompositeRead[]> {
    const parents: CompositeRead[] = [];
    let parentIdOrNull: number | null | ResourceRefWithParent = resourceId;
    while (typeof parentIdOrNull === "number") {
        const id = Number(parentIdOrNull) as number;
        const resourceItem = await route("resource.item", {
            id,
        }).get({
            signal,
            cache,
        });
        parents.push(resourceItem);
        parentIdOrNull = resourceItem.resource?.parent;
        if (parentIdOrNull && typeof parentIdOrNull !== "number") {
            parentIdOrNull = parentIdOrNull.id;
        }
    }
    return parents.reverse();
}
