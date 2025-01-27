import { routeURL } from "@nextgisweb/pyramid/api";
import { imageQueue, tileLoadFunction } from "@nextgisweb/pyramid/util";
import Image from "@nextgisweb/webmap/ol/layer/Image";

import { Adapter } from "../Adapter";

interface ItemConfig {
    id: string;
    styleId: string;
    maxResolution?: number;
    minResolution?: number;
    visibility: boolean;
    transparency?: number;
}

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

export class ImageAdapter extends Adapter {
    createLayer(item: ItemConfig) {
        const layer = new Image(
            item.id,
            {
                maxResolution: item.maxResolution,
                minResolution: item.minResolution,
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
                imageLoadFunction: (image, src) => {
                    const [url, query] = src.split("?");
                    const queryObject = parseQueryParams(query);

                    const resource = queryObject.resource;
                    const symbolsParam = queryObject.symbols;
                    const symbols = symbolsParam
                        ? `&symbols[${resource}]=${symbolsParam === "-1" ? "" : symbolsParam}`
                        : "";

                    const img = image.getImage();

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
                            }).then((imageUrl) => {
                                (img as HTMLImageElement).src = imageUrl;
                            })
                        );
                    });
                },
            }
        );

        return layer;
    }
}
