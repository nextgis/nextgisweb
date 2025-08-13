import View from "ol/View";
import type { ViewOptions } from "ol/View";
import { useCallback, useEffect, useRef, useState } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import {
    addBaselayer,
    prepareBaselayerConfig,
} from "@nextgisweb/basemap/util/baselayer";
import { useObjectState } from "@nextgisweb/gui/hook";
import type { SRSRef } from "@nextgisweb/spatial-ref-sys/type/api";
import { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type { MapExtent } from "@nextgisweb/webmap/ol/MapStore";
import type QuadKey from "@nextgisweb/webmap/ol/layer/QuadKey";
import type XYZ from "@nextgisweb/webmap/ol/layer/XYZ";

export interface MapProps extends ViewOptions {
    mapSRS?: SRSRef;
    basemap?: boolean;
    mapExtent?: MapExtent;
}

export function useMapAdapter({
    center: centerProp,
    mapSRS = { id: 3857 },
    zoom,
    basemap = true,
    minZoom,
    maxZoom,
    mapExtent: mapExtentProp,
}: MapProps) {
    const [mapStore, setMapStore] = useState<MapStore>();
    const baseRef = useRef<QuadKey | XYZ | undefined>(undefined);

    const [center] = useObjectState(centerProp);
    const [mapExtent] = useObjectState(mapExtentProp);

    const createMapAdapter = useCallback(
        ({ target }: { target: HTMLElement | string }) => {
            const view = new View({
                projection: `EPSG:${mapSRS.id}`,
            });
            const adapter = new MapStore({
                target,
                view,
                controls: [],
            });
            setMapStore(adapter);
            return adapter;
        },
        [mapSRS.id]
    );

    const setView = useCallback((): void => {
        if (!mapStore?.olMap) return;

        const curView = mapStore.olMap.getView();

        if (minZoom !== undefined) {
            curView.setMinZoom(minZoom);
        }
        if (maxZoom !== undefined) {
            curView.setMaxZoom(maxZoom);
        }

        if (mapExtent) {
            mapStore.fitNGWExtent(mapExtent);
        } else {
            if (center) {
                curView.setCenter(center);
            }
            if (zoom !== undefined) {
                curView.setZoom(zoom);
            }
        }
    }, [mapStore, center, zoom, minZoom, maxZoom, mapExtent]);

    useEffect(() => {
        setView();
    }, [setView]);

    useEffect(() => {
        if (mapStore && basemap) {
            const baselayers = settings.basemaps.filter(
                (l) => l.enabled !== false
            );
            if (baselayers.length) {
                const baselayer = baselayers[0];
                const opts = prepareBaselayerConfig(baselayer);
                addBaselayer({ ...opts, map: mapStore }).then((layer) => {
                    if (!basemap) {
                        layer?.dispose();
                    } else {
                        baseRef.current = layer;
                    }
                });
            }
        }
        return () => {
            if (baseRef.current) {
                baseRef.current.dispose();
                baseRef.current = undefined;
            }
        };
    }, [basemap, mapStore]);

    useEffect(() => {
        return () => {
            if (mapStore?.olMap) {
                mapStore.olMap.dispose();
            }
        };
    }, [mapStore]);

    return { createMapAdapter };
}
