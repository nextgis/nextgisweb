import { useEffect, useState } from "react";

import type { LayerAdapterFor } from "@nextgisweb/webmap/layer-adapter/type";

import type { LayerDefinition } from "../../layer-adapter";
import type { CoreLayer } from "../../layer-adapter/CoreLayer";
import type { MapAdapter } from "../../map-adapter";
import type { MapStore } from "../../ol/MapStore";

export function useMapLayer<T extends LayerDefinition | undefined>(
  mapStore: MapStore,
  layerDefinition: T
): LayerAdapterFor<T> | null {
  const { adapter, started } = mapStore;
  const [current, setCurrent] = useState<{
    definition: LayerDefinition;
    adapter: MapAdapter;
    layer: CoreLayer;
  } | null>(null);

  useEffect(() => {
    if (layerDefinition) {
      return mapStore.registerLayerDefinition(layerDefinition);
    }
  }, [mapStore, layerDefinition]);

  useEffect(() => {
    setCurrent(null);
    if (!started || !layerDefinition) return;
    let cancelled = false;
    let layer: CoreLayer | undefined;

    const setup = async () => {
      const created = await mapStore.createLayer(layerDefinition, adapter);
      if (!created) return;
      if (cancelled) {
        created.dispose();
        return;
      }
      layer = created;
      mapStore.addLayer(created, undefined, adapter);
      setCurrent({ adapter, layer: created, definition: layerDefinition });
    };

    setup().catch((error) => {
      if (!cancelled) console.error(error);
    });

    return () => {
      cancelled = true;
      if (layer) {
        mapStore.removeLayer(layer, adapter);
        layer.dispose();
      }
    };
  }, [mapStore, adapter, started, layerDefinition]);

  return (
    started &&
    current?.adapter === adapter &&
    current.definition === layerDefinition
      ? current.layer
      : null
  ) as LayerAdapterFor<T> | null;
}
