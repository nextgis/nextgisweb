import TileLayer from "ol/layer/Tile";
import Source from "ol/source/TileImage";
import { useEffect, useMemo, useRef } from "react";

import { tileLoadFunction } from "@nextgisweb/pyramid/util";

export function useTileLayer({
    url,
    opacity,
    attributions,
}: {
    url: string;
    opacity?: number;
    attributions?: string | null;
}) {
    const source = useRef(
        new Source({
            wrapX: true,
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
        })
    );

    useEffect(() => {
        if (attributions === null) {
            source.current.setAttributions(undefined);
        } else {
            source.current.setAttributions(attributions);
        }
    }, [attributions]);

    useEffect(() => {
        source.current.setUrl(url);
    }, [url]);

    const layer = useMemo(
        () => new TileLayer({ source: source.current }),
        [source]
    );

    useEffect(() => {
        if (layer && opacity !== undefined) {
            layer.setOpacity(opacity / 100);
        }
    }, [layer, opacity]);

    return layer;
}
