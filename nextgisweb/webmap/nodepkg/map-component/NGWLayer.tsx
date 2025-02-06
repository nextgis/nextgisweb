import { useEffect } from "react";

import { useMapContext } from "./context/useMapContext";
import { useNGWLayer } from "./hook/useNGWLayer";
import type { LayerOptions, LayerType } from "./hook/useNGWLayer";

export function NGWLayer({
    zIndex = 0,
    layerType,
    resourceId,
    layerOptions,
}: {
    zIndex?: number;
    layerType: LayerType;
    resourceId: number;
    layerOptions?: LayerOptions;
}) {
    const { mapStore: adapter } = useMapContext();

    const layer = useNGWLayer({
        layerType: layerType,
        resourceId: resourceId,
        layerOptions,
    });

    useEffect(() => {
        if (!adapter?.olMap) return;

        adapter.olMap.addLayer(layer);

        return () => {
            adapter.olMap.removeLayer(layer);
        };
    }, [layerType, resourceId, adapter, zIndex, layer]);

    useEffect(() => {
        layer.setZIndex(zIndex);
    }, [zIndex, layer]);

    return null;
}
