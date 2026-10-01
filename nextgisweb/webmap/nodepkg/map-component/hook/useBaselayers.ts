import { useEffect } from "react";

import { createBaselayer } from "@nextgisweb/basemap/util/baselayer";
import type { BaselayerOptions } from "@nextgisweb/basemap/util/baselayer";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type { CoreLayer } from "@nextgisweb/webmap/ol/layer/CoreLayer";

export function useBaselayers({
  mapStore,
  basemaps,
  baseKey,
}: {
  mapStore: MapStore;
  basemaps: BaselayerOptions[];
  baseKey?: string;
}) {
  const { makeSignal, abort } = useAbortController();

  useEffect(() => {
    if (!basemaps.length) return;

    const preferredBasemapKey =
      baseKey ?? (mapStore.baseLayer ? mapStore.activeBasemapKey : undefined);
    const signal = makeSignal();
    const layers: CoreLayer[] = [];

    const setup = async () => {
      for (const config of basemaps) {
        if (signal.aborted) return;

        try {
          const layer = await createBaselayer(config);
          if (!layer) continue;
          if (signal.aborted) {
            layer.dispose();
            return;
          }

          if (layer.olLayer.getVisible()) {
            mapStore.setBaseLayer(layer);
          }
          mapStore.addLayer(layer);
          layers.push(layer);
        } catch {
          //
        }
      }

      if (preferredBasemapKey && !signal.aborted) {
        mapStore.switchBasemap(preferredBasemapKey);
      }
    };

    setup();

    return () => {
      abort();
      for (const layer of layers) {
        mapStore.removeLayer(layer);
        layer.dispose();
      }
    };
  }, [abort, basemaps, baseKey, makeSignal, mapStore]);
}
