import { routeURL } from "@nextgisweb/pyramid/api";
import { imageQueue, tileLoadFunction } from "@nextgisweb/pyramid/util";
import { QUEUE_ABORT_REASON } from "@nextgisweb/pyramid/util/queue";
import Image from "@nextgisweb/webmap/ol/layer/Image";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { LayerDisplayAdapter } from "../DisplayLayerAdapter";

interface QueryParams {
    resource: string;
    symbols?: string;
    BBOX?: string;
    WIDTH?: string;
    HEIGHT?: string;
}

function parseQueryParams(queryString: string): QueryParams {
    const urlParams = new URLSearchParams(queryString);

    const params: QueryParams = {
        resource: urlParams.get("resource") || "",
        symbols: urlParams.get("symbols") || undefined,
        BBOX: urlParams.get("BBOX") || undefined,
        WIDTH: urlParams.get("WIDTH") || undefined,
        HEIGHT: urlParams.get("HEIGHT") || undefined,
    };

    return params;
}

export class ImageAdapter extends LayerDisplayAdapter {
    createLayer(item: LayerItemConfig) {
        const layer = new Image(
            String(item.id),
            {
                maxResolution: item.maxResolution ?? undefined,
                minResolution: item.minResolution ?? undefined,
                visible: item.visibility,
                opacity: item.transparency ? 1 - item.transparency / 100 : 1.0,
            },
            {
                url: routeURL("render.image"),
                params: {
                    resource: item.styleId,
                },
                ratio: 1,
                crossOrigin: "anonymous",
                imageLoadFunction: (imageTile, src) => {
                    const [url, query] = src.split("?");
                    const queryObject = parseQueryParams(query);

                    const resource = queryObject.resource;
                    const symbolsParam = queryObject.symbols;
                    const symbols = symbolsParam
                        ? `&symbols[${resource}]=${symbolsParam === "-1" ? "" : symbolsParam}`
                        : "";

                    const newSrc =
                        `${url}?resource=${resource}` +
                        `&extent=${queryObject.BBOX}` +
                        `&size=${queryObject.WIDTH},${queryObject.HEIGHT}` +
                        "&nd=204" +
                        symbols;

                    // Use a timeout to prevent the queue from aborting right after adding,
                    // especially in cases with zoomToExtent.
                    setTimeout(() => {
                        imageQueue.add(({ signal }) =>
                            tileLoadFunction({
                                src: newSrc,
                                cache: "no-cache",
                                signal,
                            })
                                .then((imageUrl) => {
                                    const img =
                                        imageTile.getImage() as HTMLImageElement;
                                    img.src = imageUrl;
                                })
                                .catch((error) => {
                                    if (error !== QUEUE_ABORT_REASON) {
                                        console.error(error);
                                    }
                                })
                        );
                    });
                },
            }
        );

        return layer;
    }
}
