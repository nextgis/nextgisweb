import TileLayer from "ol/layer/Tile";
import Source from "ol/source/TileImage";
import { useEffect, useMemo, useRef } from "react";

export function useTileLayer({
    url,
    opacity,
    attributions,
}: {
    url: string;
    opacity?: number;
    attributions?: string | null;
}) {
    const source = useRef(new Source({ wrapX: true }));

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
