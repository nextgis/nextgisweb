import { route } from "@nextgisweb/pyramid/api";

export async function loadParents(resourceId, { signal, cache = true }) {
    const parents = [];
    let parentIdOrNull = resourceId;
    while (typeof parentIdOrNull === "number") {
        const resourceItem = await route("resource.item", {
            id: parentIdOrNull,
        }).get({
            signal,
            cache,
        });
        parents.push(resourceItem);
        parentIdOrNull = resourceItem.resource.parent;
        if (parentIdOrNull) {
            parentIdOrNull = parentIdOrNull.id;
        }
    }
    return parents.reverse();
}
