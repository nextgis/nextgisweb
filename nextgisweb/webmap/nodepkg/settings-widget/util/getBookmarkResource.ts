import { route } from "@nextgisweb/pyramid/api";

export async function getBookmarkResource({
    resourceId,
    signal,
}: {
    resourceId: number;
    signal?: AbortSignal;
}) {
    const res = await route("resource.item", resourceId).get({
        cache: true,
        signal,
    });

    if (res.resource.parent && res.resource.parent.id !== undefined) {
        return {
            id: resourceId,
            parent: { id: res.resource.parent.id },
        };
    }
}
