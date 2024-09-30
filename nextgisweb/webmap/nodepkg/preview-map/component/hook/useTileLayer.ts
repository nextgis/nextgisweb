import TileLayer from "ol/layer/Tile";
import Source from "ol/source/TileImage";
import { useEffect, useMemo, useRef } from "react";

export function useTileLayer({
    url,
    attributions,
}: {
    url: string;
    attributions?: string | null;
}) {
    const source = useRef(new Source({}));

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

    return layer;
}
