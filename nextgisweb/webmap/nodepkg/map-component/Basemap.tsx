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
    const { mapStore } = useMapContext();
    const basemap = useTileLayer({ url, attributions, opacity });
    useEffect(() => {
        mapStore?.olMap.addLayer(basemap);

        return () => {
            mapStore?.olMap.removeLayer(basemap);
        };
    }, [mapStore, url, basemap]);
    return null;
}
