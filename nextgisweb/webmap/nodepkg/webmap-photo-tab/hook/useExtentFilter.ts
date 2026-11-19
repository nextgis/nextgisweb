import { equals as extentEquals } from "ol/extent";
import WKT from "ol/format/WKT";
import { fromExtent } from "ol/geom/Polygon";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchFeaturesItems } from "@nextgisweb/feature-layer/feature-grid/api/fetchFeatures";
import type { Display } from "@nextgisweb/webmap/display";
import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

export type ExtentFilterStatus = "off" | "loading" | "on";

const wkt = new WKT();

interface UseExtentFilterOptions {
  store: PhotoLayerStore;
  display: Display;
  onError: () => void;
}

export function useExtentFilter({
  store,
  display,
  onError,
}: UseExtentFilterOptions) {
  const { layerId } = store;
  const [status, setStatus] = useState<ExtentFilterStatus>("off");
  const [featureIds, setFeatureIds] = useState<Set<number>>();
  const intersects = useRef<string>(undefined);
  const controller = useRef<AbortController>(undefined);
  const ignoreNextMove = useRef(false);
  const enabled = status !== "off";
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const queryFeatureIds = useCallback(
    async (geom: string) => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      try {
        const features = await fetchFeaturesItems({
          resourceId: layerId,
          intersects: geom,
          fields: [],
          extensions: [],
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return undefined;
        return new Set(features.map((f) => f.id));
      } catch (err) {
        if (ctrl.signal.aborted) return undefined;
        throw err;
      } finally {
        if (controller.current === ctrl) controller.current = undefined;
      }
    },
    [layerId]
  );

  const clear = useCallback(() => {
    controller.current?.abort();
    intersects.current = undefined;
    ignoreNextMove.current = false;
    setFeatureIds(undefined);
    setStatus("off");
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    if (!enabled) return;
    return display.map.adapter.subscribeMoveEnd(() => {
      if (ignoreNextMove.current) {
        ignoreNextMove.current = false;
        return;
      }
      clear();
    });
  }, [display, enabled, clear]);

  useEffect(
    () =>
      store.subscribeFeatureUpdate(() => {
        const geom = intersects.current;
        if (geom === undefined) return;
        queryFeatureIds(geom)
          .then((ids) => {
            if (!ids) return;
            setFeatureIds(ids);
            setStatus("on");
          })
          .catch(() => {});
      }),
    [store, queryFeatureIds]
  );

  const apply = async () => {
    const geom = wkt.writeGeometry(fromExtent(display.map.getExtent()));
    intersects.current = geom;
    setStatus("loading");
    try {
      const ids = await queryFeatureIds(geom);
      if (!ids) return;
      setFeatureIds(ids);
      setStatus("on");
    } catch {
      onError();
      clear();
    }
  };

  const toggle = () => {
    if (enabled) {
      clear();
    } else {
      apply();
    }
  };

  const moveKeepingFilter = useCallback(
    (move: () => void) => {
      const before = display.map.getExtent();
      move();
      if (enabledRef.current) {
        ignoreNextMove.current = !extentEquals(before, display.map.getExtent());
      }
    },
    [display]
  );

  return { status, featureIds, toggle, clear, moveKeepingFilter };
}
