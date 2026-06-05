import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";

import { useMemoDebounce } from "@nextgisweb/pyramid/hook";
import type { LayerDisplayAdapterCtor } from "@nextgisweb/webmap/DisplayLayerAdapter";
import { entrypointsLoader } from "@nextgisweb/webmap/compat/util/entrypointLoader";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import type { CoreLayer } from "@nextgisweb/webmap/ol/layer/CoreLayer";
import type { TreeStore } from "@nextgisweb/webmap/store";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import { filterItems } from "@nextgisweb/webmap/store/tree-store/treeStoreUtil";

const WebmapLayer = observer(({ layerItem }: { layerItem: TreeLayerStore }) => {
  const layerItemRef = useRef(layerItem);
  const [layer, setLayer] = useState<CoreLayer | null>(null);
  const layerRef = useRef(layer);

  const {
    visibility,
    opacity,
    symbols,
    filter,
    drawOrderPosition,
    legendInfo,
  } = layerItem;
  const { mapStore } = useMapContext();
  const { hmux } = mapStore;

  const resolutionDebounced = useMemoDebounce(mapStore.resolution, 100);

  useEffect(() => {
    layerItemRef.current = layerItem;
  }, [layerItem]);

  useEffect(() => {
    let cancelled = false;
    const item = layerItemRef.current;
    let existLayer: CoreLayer | undefined = mapStore.getLayer(item.id);
    const setup = async () => {
      if (!existLayer) {
        const Adapter = (await entrypointsLoader([item.adapter]))[
          item.adapter
        ] as LayerDisplayAdapterCtor;
        if (cancelled) return;
        let minResolution, maxResolution;
        if (item.maxScaleDenom !== null) {
          minResolution = mapStore.resolutionForScale(item.maxScaleDenom);
        }
        if (item.minScaleDenom !== null) {
          maxResolution = mapStore.resolutionForScale(item.minScaleDenom);
        }
        item.update({ minResolution, maxResolution });

        existLayer = new Adapter().createLayer(item, {
          hmux: hmux ?? undefined,
        });

        mapStore.addLayer(
          existLayer,
          layerItemRef.current.drawOrderPosition ?? undefined
        );
      }
      setLayer(existLayer);
    };
    setup();

    return () => {
      cancelled = true;
      if (existLayer) {
        mapStore.removeLayer(existLayer);
      }
    };
  }, [mapStore, hmux]);

  useEffect(() => {
    layerRef.current = layer;
  }, [layer]);

  useEffect(() => {
    if (layer) {
      layer.setVisibility(visibility);
    }
  }, [visibility, layer, mapStore]);

  useEffect(() => {
    if (layer && opacity !== null && opacity !== undefined) {
      layer.setOpacity(opacity);
    }
  }, [opacity, layer, mapStore]);

  useEffect(() => {}, []);

  useEffect(() => {
    if (layer) {
      layer.setSymbols(symbols);
    }
  }, [layer, symbols]);

  useEffect(() => {
    if (layer) {
      layer.setFilter(filter);
    }
  }, [layer, filter]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.reload();
    }
  }, [legendInfo.changeStamp]);

  useEffect(() => {
    if (layerRef.current && drawOrderPosition !== null) {
      layerRef.current.setZIndex(drawOrderPosition);
    }
  }, [drawOrderPosition]);

  useEffect(() => {
    const r = resolutionDebounced;
    if (!layer || r === null) return;
    const ol = layer.olLayer;

    const isOutOfScaleRange =
      r < ol.getMinResolution() || r >= ol.getMaxResolution();

    layerItemRef.current.update({ isOutOfScaleRange });
  }, [layer, resolutionDebounced]);

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
