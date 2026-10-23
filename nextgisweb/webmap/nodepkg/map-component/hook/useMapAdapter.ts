import type { ViewOptions } from "ol/View";
import { get as getProjection } from "ol/proj";
import { useEffect, useMemo, useRef } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import { prepareBaselayerConfig } from "@nextgisweb/basemap/util/baselayer";
import { useObjectState } from "@nextgisweb/gui/hook";
import { convertWSENToNgwExtent } from "@nextgisweb/gui/util/extent";
import type { MapExtent } from "@nextgisweb/webmap/map-adapter";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type { ExtentWSEN } from "@nextgisweb/webmap/type/api";

import { createMapAdapter } from "../util/createMapAdapter";

import { useBaselayers } from "./useBaselayers";

export interface MapProps extends ViewOptions {
  mapSRSId?: number;
  basemap?: boolean;
  mapStore?: MapStore;
  mapExtent?: MapExtent;
  allowMapModeChange?: boolean;
}

export function useMapAdapter({
  zoom,
  center: centerProp,
  mapSRSId = 3857,
  basemap = false,
  minZoom,
  maxZoom,
  mapStore: mapStoreProp,
  mapExtent: mapExtentProp,
  allowMapModeChange = true,
  ...restViewOptions
}: MapProps) {
  const [center] = useObjectState(centerProp);
  const [viewOptions] = useObjectState(restViewOptions);
  const [mapExtent] = useObjectState(mapExtentProp);

  const effectiveExtent = useMemo(() => {
    // Default to maximum extent
    const fullExtent = getProjection(`EPSG:${mapSRSId}`)?.getExtent();
    return (
      mapExtent ||
      (fullExtent && {
        extent: convertWSENToNgwExtent(fullExtent as ExtentWSEN),
        srs: { id: mapSRSId },
      })
    );
  }, [mapExtent, mapSRSId]);

  const mapStoreRef = useRef<MapStore>(null);
  let mapStore = mapStoreProp;
  if (!mapStore) {
    if (!mapStoreRef.current) {
      mapStoreRef.current = createMapAdapter({
        viewOptions: {
          projection: `EPSG:${mapSRSId}`,
          ...viewOptions,
        },
        initialView: {
          center,
          zoom,
          minZoom,
          maxZoom,
          extent: effectiveExtent,
        },
      });
    }
    mapStore = mapStoreRef.current;
  }

  useEffect(() => {
    mapStore.setMapModeOptions({ allowMapModeChange });
  }, [mapStore, allowMapModeChange]);

  const basemaps = useMemo(() => {
    if (!basemap) return [];
    const config = settings.basemaps.find((l) => l.enabled !== false);
    return config ? [prepareBaselayerConfig(config)] : [];
  }, [basemap]);

  useBaselayers({ mapStore, basemaps });

  useEffect(() => {
    if (mapStore.started) {
      mapStore.setViewOptions({ minZoom, maxZoom });
    }
  }, [mapStore, mapStore.adapter, mapStore.started, minZoom, maxZoom]);

  return { mapStore };
}
