import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import { useMapContext } from "./context/useMapContext";
import { useNGWLayer } from "./hook/useNGWLayer";
import type { LayerOptions, LayerType } from "./hook/useNGWLayer";

export const NGWLayer = observer(function NGWLayer({
  zIndex = 0,
  layerType,
  resourceId,
  layerOptions,
  opacity,
}: {
  zIndex?: number;
  layerType: LayerType;
  resourceId: number;
  layerOptions?: LayerOptions;
  opacity?: number;
}) {
  const { mapStore: adapter } = useMapContext();

  const [layer, control] = useNGWLayer({
    mapStore: adapter,
    layerType: layerType,
    resourceId: resourceId,
    layerOptions,
  });

  useEffect(() => {
    if (!layer) return;
    layer.setZIndex(zIndex);
  }, [zIndex, layer]);

  useEffect(() => {
    if (layer && opacity !== undefined) {
      layer.setOpacity(opacity / 100);
    }
  }, [opacity, layer]);

  return <>{control}</>;
});
