import { useEffect } from "react";

import { useMapContext } from "./context/useMapContext";
import { useNGWLayer } from "./hook/useNGWLayer";
import type { LayerType } from "./hook/useNGWLayer";

export function NGWLayer({
    zIndex = 0,
    layerType,
    resourceId,
}: {
    zIndex?: number;
    layerType: LayerType;
    resourceId: number;
}) {
    const { mapAdapter: adapter } = useMapContext();

    const layer = useNGWLayer({
        layerType: layerType,
        resourceId: resourceId,
    });

    useEffect(() => {
        if (!adapter?.map) return;

        adapter.map.addLayer(layer);

        return () => {
            adapter.map.removeLayer(layer);
        };
    }, [layerType, resourceId, adapter, zIndex, layer]);

    useEffect(() => {
        layer.setZIndex(zIndex);
    }, [zIndex, layer]);

    return null;
}
