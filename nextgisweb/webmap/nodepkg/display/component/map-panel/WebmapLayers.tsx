import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";

import { useMemoDebounce } from "@nextgisweb/pyramid/hook";
import type { WebmapLayerDefinition } from "@nextgisweb/webmap/layer-adapter";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import { useMapLayer } from "@nextgisweb/webmap/map-component/hook/useMapLayer";
import type { TreeStore } from "@nextgisweb/webmap/store";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import {
  filterItems,
  isLayerOutOfScaleRange,
} from "@nextgisweb/webmap/store/tree-store/treeStoreUtil";

const WebmapLayer = observer(({ layerItem }: { layerItem: TreeLayerStore }) => {
  const { mapStore } = useMapContext();
  const { hmux, resolution } = mapStore;
  const {
    filter,
    adapter,
    visible,
    opacity,
    symbols,
    minResolution,
    maxResolution,
    minScaleDenom,
    maxScaleDenom,
    drawOrderPosition,
  } = layerItem;
  const changeStamp = layerItem.legendInfo.changeStamp;
  const previousChangeStamp = useRef(changeStamp);

  const resolutionDebounced = useMemoDebounce(resolution, 100);
  const effectiveVisible =
    visible && !isLayerOutOfScaleRange(layerItem, resolution);

  const layerDefinition = useMemo<WebmapLayerDefinition>(
    () => ({
      type: "webmap",
      item: { ...layerItem.dump(), adapter },
      options: { hmux: hmux ?? undefined },
    }),
    [layerItem, adapter, hmux]
  );
  const layer = useMapLayer(mapStore, layerDefinition);

  useEffect(() => {
    layerItem.update({
      minResolution:
        maxScaleDenom !== null
          ? (mapStore.resolutionForScale(maxScaleDenom) ?? null)
          : null,
      maxResolution:
        minScaleDenom !== null
          ? (mapStore.resolutionForScale(minScaleDenom) ?? null)
          : null,
    });
  }, [layerItem, mapStore, minScaleDenom, maxScaleDenom]);

  useEffect(() => {
    layer?.setResolutionRange(minResolution, maxResolution);
  }, [layer, minResolution, maxResolution]);

  useEffect(() => {
    layer?.setVisibility(effectiveVisible);
  }, [layer, effectiveVisible]);

  useEffect(() => {
    if (layer && opacity !== null && opacity !== undefined) {
      layer.setOpacity(opacity);
    }
  }, [layer, opacity]);

  useEffect(() => {
    layer?.setSymbols(symbols);
  }, [layer, symbols]);

  useEffect(() => {
    layer?.setFilter(filter);
  }, [layer, filter]);

  useEffect(() => {
    if (layer && drawOrderPosition !== null) {
      layer.setZIndex(drawOrderPosition);
    }
  }, [layer, drawOrderPosition]);

  useEffect(() => {
    if (changeStamp !== previousChangeStamp.current) {
      layer?.reload();
    }
    previousChangeStamp.current = changeStamp;
  }, [layer, changeStamp]);

  useEffect(() => {
    const r = resolutionDebounced;
    if (r === null) return;
    layerItem.update({
      isOutOfScaleRange: isLayerOutOfScaleRange(layerItem, resolutionDebounced),
    });
  }, [layerItem, resolutionDebounced, minScaleDenom, maxScaleDenom]);

  return null;
});

WebmapLayer.displayName = "WebmapLayer";

export const WebmapLayers = observer(
  ({ treeStore }: { treeStore: TreeStore }) => {
    const layerItems = filterItems(Array.from(treeStore.items.values()), {
      type: "layer",
    });

    return layerItems.map((it) => <WebmapLayer key={it.id} layerItem={it} />);
  }
);

WebmapLayers.displayName = "WebmapLayers";
