import { useContext, useEffect } from "react";

import { MapContext } from "./MapComponent";
import { useTileLayer } from "./hook/useTileLayer";

export function Basemap({
    url,
    attributions,
}: {
    url: string;
    zoomTo?: boolean;
    attributions?: string | null;
}) {
    const { adapter } = useContext(MapContext);
    const basemap = useTileLayer({ url, attributions });
    useEffect(() => {
        if (adapter?.map) {
            adapter.map.addLayer(basemap);

            return () => {
                adapter.map.removeLayer(basemap);
            };
        }
    }, [adapter, url, basemap]);
    return null;
}
