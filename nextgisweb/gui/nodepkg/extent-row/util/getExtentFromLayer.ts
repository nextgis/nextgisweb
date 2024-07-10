import { route } from "@nextgisweb/pyramid/api";

import type { Extent } from "../type";

export async function getExtentFromLayer({
    resourceId,
    signal,
}: {
    resourceId: number;
    signal?: AbortSignal;
}) {
    const { extent } = await route("layer.extent", resourceId).get({
        cache: true,
        signal,
    });
    const result = {
        left: extent.minLon,
        right: extent.maxLon,
        bottom: extent.maxLat,
        top: extent.minLat,
    } as Extent;

    return result;
}
