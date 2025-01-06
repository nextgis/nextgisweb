import { routeURL } from "@nextgisweb/pyramid/api";
import { tileLoadFunction } from "@nextgisweb/pyramid/util";
import XYZ from "@nextgisweb/webmap/ol/layer/XYZ";

import { Adapter } from "../Adapter";

interface ItemConfig {
    id: string;
    styleId: string;
    maxResolution?: number;
    minResolution?: number;
    visibility: boolean;
    transparency?: number;
}

export default class TileAdapter extends Adapter {
    createLayer(item: ItemConfig) {
        const layer = new XYZ(
            item.id,
            {
                visible: item.visibility,
                maxResolution: item.maxResolution,
                minResolution: item.minResolution,
                opacity: item.transparency ? 1 - item.transparency / 100 : 1.0,
            },
            {
                url: `${routeURL("render.tile")}?z={z}&x={x}&y={y}&resource=${item.styleId}&nd=204`,
                crossOrigin: "anonymous",
                tileLoadFunction: (image, src) => {
                    // @ts-expect-error Property 'getImage' does not exist on type 'Tile'.
                    const img = image.getImage() as HTMLImageElement;
                    const abortController = new AbortController();

                    tileLoadFunction({
                        src,
                        signal: abortController.signal,
                        cache: "force-cache",
                    }).then((imageUrl) => {
                        img.src = imageUrl;
                    });
                },
            }
        );

        return layer;
    }
}
