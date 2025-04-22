import { routeURL } from "@nextgisweb/pyramid/api";
import { tileLoadFunction, transparentImage } from "@nextgisweb/pyramid/util";
import XYZ from "@nextgisweb/webmap/ol/layer/XYZ";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { LayerDisplayAdapter } from "../DisplayLayerAdapter";

export default class TileAdapter extends LayerDisplayAdapter {
    createLayer(item: LayerItemConfig) {
        const layer = new XYZ(
            String(item.id),
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
                        cache: "force-cache",
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
}
