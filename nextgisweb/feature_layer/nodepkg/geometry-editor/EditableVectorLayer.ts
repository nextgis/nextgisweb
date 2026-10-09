import { observer } from "mobx-react-lite";
import VectorLayer from "ol/layer/Vector";
import type VectorSource from "ol/source/Vector";
import type { Style } from "ol/style";
import { useEffect, useRef, useState } from "react";

import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import { hasOlMap } from "@nextgisweb/webmap/ol/util/hasOlMap";

interface VectorLayerProps {
  source: VectorSource;
  style?: Style;
  zIndex?: number;
}

export const EditableVectorLayer = observer(function EditableVectorLayer({
  source,
  style,
  zIndex,
}: VectorLayerProps) {
  const { mapStore } = useMapContext();
  const { adapter } = mapStore;
  const olMap = hasOlMap(adapter) ? adapter.map : undefined;
  const [layer, setLayer] = useState<VectorLayer>();
  const layerRef = useRef<VectorLayer>(null);

  useEffect(() => {
    if (!olMap) return;
    const vectorLayer = new VectorLayer({
      source,
      style,
    });

    layerRef.current = vectorLayer;
    setLayer(vectorLayer);
    olMap.addLayer(vectorLayer);

    return () => {
      if (layerRef.current) {
        olMap.removeLayer(layerRef.current);
      }
    };
  }, [olMap, source, style]);

  useEffect(() => {
    if (layer && typeof zIndex === "number") {
      layer.setZIndex(zIndex);
    }
  }, [zIndex, layer]);

  return null;
});
