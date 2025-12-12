import { routeURL } from "@nextgisweb/pyramid/api";
import { tileLoadFunction, transparentImage } from "@nextgisweb/pyramid/util";
import XYZ from "@nextgisweb/webmap/ol/layer/XYZ";

import type { CreateDisplayAdapterLayerOptions } from "../DisplayLayerAdapter";
import type { CreateLayerOptions } from "../type/CreateLayerOptions";

export function createTileLayer(
    item: CreateLayerOptions,
    options?: CreateDisplayAdapterLayerOptions
) {
    const name =
        item.id !== undefined
            ? String(item.id)
            : Math.random().toString(36).slice(2);
    const layer = new XYZ(
        name,
        {
            visible: item.visibility,
            maxResolution: item.maxResolution ?? undefined,
            minResolution: item.minResolution ?? undefined,
            opacity: item.transparency ? 1 - item.transparency / 100 : 1.0,
        },
        {
            url: `${routeURL("render.tile")}?z={z}&x={x}&y={y}&resource=${item.styleId}&nd=204`,
            crossOrigin: "anonymous",
            tileLoadFunction: (image, src) => {
                // @ts-expect-error Property 'getImage' does not exist on type 'Tile'.
                const img = image.getImage() as HTMLImageElement;

                tileLoadFunction({
                    src,
                    hmux: options?.hmux,
                })
                    .then((imageUrl) => {
                        img.src = imageUrl;
                    })
                    .catch(() => {
                        img.src = transparentImage;
                    });
            },
        }
    );

    return layer;
}
