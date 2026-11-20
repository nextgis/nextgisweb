import { getCenter } from "ol/extent";
import WKT from "ol/format/WKT";
import { useCallback, useEffect, useRef, useState } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { route } from "@nextgisweb/pyramid/api";
import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

export type LocationSortMode = "none" | "west-east" | "north-south";

export type FeaturePositions = Map<number, [lon: number, lat: number]>;

const wkt = new WKT();

interface UseLocationSortOptions {
  store: PhotoLayerStore;
  onError: () => void;
}

export function useLocationSort({ store, onError }: UseLocationSortOptions) {
  const { layerId } = store;
  const [mode, setMode] = useState<LocationSortMode>("none");
  const [positions, setPositions] = useState<FeaturePositions>();
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController>(undefined);
  const enabled = mode !== "none";

  const queryPositions = useCallback(async () => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      const features = await route(
        "feature_layer.feature.collection",
        layerId
      ).get<FeatureItem[]>({
        query: {
          geom: true,
          geom_format: "wkt",
          srs: 4326,
          fields: [],
          extensions: [],
        },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return undefined;
      const result: FeaturePositions = new Map();
      for (const { id, geom } of features) {
        if (!geom) continue;
        const [lon, lat] = getCenter(wkt.readGeometry(geom).getExtent());
        result.set(id, [lon, lat]);
      }
      return result;
    } catch (err) {
      if (ctrl.signal.aborted) return undefined;
      throw err;
    } finally {
      if (controller.current === ctrl) controller.current = undefined;
    }
  }, [layerId]);

  const clear = useCallback(() => {
    controller.current?.abort();
    setPositions(undefined);
    setLoading(false);
    setMode("none");
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    if (!enabled) return;
    return store.subscribeFeatureUpdate(() => {
      queryPositions()
        .then((result) => {
          if (result) setPositions(result);
        })
        .catch(() => {});
    });
  }, [store, enabled, queryPositions]);

  const select = async (next: LocationSortMode) => {
    if (next === "none") {
      clear();
      return;
    }
    setMode(next);
    if (positions) return;
    setLoading(true);
    try {
      const result = await queryPositions();
      if (!result) return;
      setPositions(result);
      setLoading(false);
    } catch {
      onError();
      clear();
    }
  };

  return { mode, positions, loading, select };
}
