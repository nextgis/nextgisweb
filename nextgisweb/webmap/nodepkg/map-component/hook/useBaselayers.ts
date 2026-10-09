import { useEffect, useMemo } from "react";

import type {
  TileLayerDefinition,
  TileLayerOptions,
} from "@nextgisweb/webmap/layer-adapter";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { useMapLayer } from "./useMapLayer";

export function useBaselayers({
  mapStore,
  basemaps,
  baseKey,
}: {
  mapStore: MapStore;
  basemaps: TileLayerOptions[];
  baseKey?: string;
}) {
  const configs = useMemo(
    () =>
      basemaps.map((config) => ({
        ...config,
        name: config.name,
        isBaseLayer: true,
      })),
    [basemaps]
  );
  const { activeBasemapKey, zoom } = mapStore;
  const config = configs.find((item) => item.name === activeBasemapKey);

  useEffect(() => {
    mapStore.setBasemapConfigs(configs, baseKey);
  }, [mapStore, configs, baseKey]);

  const layerDefinition = useMemo<TileLayerDefinition | undefined>(
    () => (config ? { type: "tile", options: config } : undefined),
    [config]
  );
  const layer = useMapLayer(mapStore, layerDefinition);

  useEffect(() => {
    const minZoom = config?.layer?.minZoom;
    layer?.setVisibility(
      minZoom === undefined || (zoom !== null && zoom > minZoom)
    );
  }, [layer, config, zoom]);
}
