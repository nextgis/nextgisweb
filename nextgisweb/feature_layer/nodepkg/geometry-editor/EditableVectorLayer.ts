import VectorLayer from "ol/layer/Vector";
import type VectorSource from "ol/source/Vector";
import type { Style } from "ol/style";
import { useEffect, useRef, useState } from "react";

import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";

interface VectorLayerProps {
    source: VectorSource;
    style?: Style;
    zIndex?: number;
}

export function EditableVectorLayer({
    source,
    style,
    zIndex,
}: VectorLayerProps) {
    const { mapStore } = useMapContext();
    const [layer, setLayer] = useState<VectorLayer>();
    const layerRef = useRef<VectorLayer>(null);

    useEffect(() => {
        if (!mapStore) return;
        const vectorLayer = new VectorLayer({
            source,
            style,
        });

        layerRef.current = vectorLayer;
        setLayer(vectorLayer);
        mapStore.olMap.addLayer(vectorLayer);

        return () => {
            if (layerRef.current) {
                mapStore.olMap.removeLayer(layerRef.current);
            }
        };
    }, [mapStore, source, style]);

    useEffect(() => {
        if (layer && typeof zIndex === "number") {
            layer.setZIndex(zIndex);
        }
    }, [zIndex, layer]);

    return null;
}
