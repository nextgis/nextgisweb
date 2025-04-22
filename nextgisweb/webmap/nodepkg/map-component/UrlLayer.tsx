import { useEffect, useRef, useState } from "react";

import { createTileLayer } from "@nextgisweb/basemap/util/baselayer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { tileLoadFunction } from "@nextgisweb/pyramid/util";
import type QuadKey from "@nextgisweb/webmap/ol/layer/QuadKey";
import type XYZ from "@nextgisweb/webmap/ol/layer/XYZ";

import { useMapContext } from "./context/useMapContext";

const exptyTileText = gettext("Unable to load tile");
function createEmptyTile(
    text = exptyTileText,
    width = 256,
    height = 256,
    textColor = "#808080"
) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }
    return canvas.toDataURL("image/png");
}

const emptyTile = createEmptyTile();

export function UrlLayer({
    url,
    opacity,
    attributions,
}: {
    url: string;
    opacity?: number;
    attributions?: string | null;
}) {
    const { mapStore } = useMapContext();

    const [layer, setLayer] = useState<QuadKey | XYZ | undefined>(undefined);
    const layerRef = useRef<QuadKey | XYZ | undefined>(undefined);

    useEffect(() => {
        const abortController = new AbortController();
        if (mapStore && url) {
            createTileLayer({
                source: {
                    attributions: attributions ?? undefined,
                    url,
                    wrapX: true,
                    crossOrigin: "anonymous",
                    tileLoadFunction: (image, src) => {
                        // @ts-expect-error Property 'getImage' does not exist on type 'Tile'.
                        const img = image.getImage() as HTMLImageElement;

                        tileLoadFunction({
                            src,
                            cache: "force-cache",
                            noDataStatuses: [404, 204],

                            signal: abortController.signal,
                        })
                            .then((imageUrl) => {
                                img.src = imageUrl;
                            })
                            .catch(() => {
                                img.src = emptyTile;
                            });
                    },
                },
            }).then((tileLayer) => {
                if (!abortController.signal.aborted && tileLayer) {
                    layerRef.current = tileLayer;

                    tileLayer.setZIndex(1);
                    setLayer(tileLayer);
                    mapStore.addLayer(tileLayer);
                }
            });
        }
        return () => {
            abortController.abort();
            if (layerRef.current) {
                layerRef.current.dispose();
            }
        };
    }, [mapStore, attributions, url]);

    useEffect(() => {
        if (layer && opacity !== undefined) {
            layer.setOpacity(opacity / 100);
        }
    }, [opacity, layer]);

    return null;
}
