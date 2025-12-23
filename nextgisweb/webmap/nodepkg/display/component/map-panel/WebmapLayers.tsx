import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";

import { useMemoDebounce } from "@nextgisweb/pyramid/hook";
import type { LayerDisplayAdapterCtor } from "@nextgisweb/webmap/DisplayLayerAdapter";
import { entrypointsLoader } from "@nextgisweb/webmap/compat/util/entrypointLoader";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type { CoreLayer } from "@nextgisweb/webmap/ol/layer/CoreLayer";
import type { TreeStore } from "@nextgisweb/webmap/store";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import { filterItems } from "@nextgisweb/webmap/store/tree-store/treeStoreUtil";

const WebmapLayer = observer(
    ({
        layerItem,
        mapStore,
    }: {
        layerItem: TreeLayerStore;
        mapStore: MapStore;
    }) => {
        const layerItemRef = useRef(layerItem);
        const [layer, setLayer] = useState<CoreLayer | null>(null);

        const { visibility, opacity, symbols, drawOrderPosition } = layerItem;
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
                        minResolution = mapStore.resolutionForScale(
                            item.maxScaleDenom
                        );
                    }
                    if (item.minScaleDenom !== null) {
                        maxResolution = mapStore.resolutionForScale(
                            item.minScaleDenom
                        );
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
            if (layer) {
                layer.setVisibility(visibility);
            }
        }, [visibility, layer, mapStore]);

        useEffect(() => {
            if (layer && opacity !== null && opacity !== undefined) {
                layer.setOpacity(opacity);
            }
        }, [opacity, layer, mapStore]);

        useEffect(() => {
            if (layer) {
                layer.setSymbols(symbols);
            }
        }, [layer, symbols]);

        useEffect(() => {
            if (layer && drawOrderPosition !== null) {
                layer.setZIndex(drawOrderPosition);
            }
        }, [layer, drawOrderPosition]);

        useEffect(() => {
            const r = resolutionDebounced;
            if (!layer || r === null) return;
            const ol = layer.olLayer;

            const isOutOfScaleRange =
                r < ol.getMinResolution() || r >= ol.getMaxResolution();

            layerItemRef.current.update({ isOutOfScaleRange });
        }, [layer, resolutionDebounced]);

        return null;
    }
);

WebmapLayer.displayName = "WebmapLayer";

export const WebmapLayers = observer(
    ({ treeStore, mapStore }: { treeStore: TreeStore; mapStore: MapStore }) => {
        const layerItems = filterItems(Array.from(treeStore.items.values()), {
            type: "layer",
        });

        return layerItems.map((it) => (
            <WebmapLayer key={it.id} layerItem={it} mapStore={mapStore} />
        ));
    }
);

WebmapLayers.displayName = "WebmapLayers";
