import { useEffect } from "react";

import { useMapContext } from "./context/useMapContext";
import { useTileLayer } from "./hook/useTileLayer";

export function Basemap({
    url,
    opacity,
    attributions,
}: {
    url: string;
    opacity?: number;
    attributions?: string | null;
}) {
    const { mapAdapter } = useMapContext();
    const basemap = useTileLayer({ url, attributions, opacity });
    useEffect(() => {
        mapAdapter?.addLayer(basemap);

        return () => {
            mapAdapter?.removeLayer(basemap);
        };
    }, [mapAdapter, url, basemap]);
    return null;
}
