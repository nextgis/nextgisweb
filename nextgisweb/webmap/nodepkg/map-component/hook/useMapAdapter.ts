import type { ViewOptions } from "ol/View";
import { useCallback, useEffect, useRef, useState } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import {
    addBaselayer,
    prepareBaselayerConfig,
} from "@nextgisweb/basemap/util/baselayer";
import { useObjectState } from "@nextgisweb/gui/hook";
import type { MapExtent, MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type QuadKey from "@nextgisweb/webmap/ol/layer/QuadKey";
import type XYZ from "@nextgisweb/webmap/ol/layer/XYZ";

import { createMapAdapter } from "../util/createMapAdapter";

export interface MapProps extends ViewOptions {
    mapSRSId?: number;
    basemap?: boolean;
    mapStore?: MapStore;
    mapExtent?: MapExtent;
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
}: MapProps) {
    const [mapStore, setMapStore] = useState<MapStore | null>(null);
    const baseRef = useRef<QuadKey | XYZ | undefined>(undefined);

    const [center] = useObjectState(centerProp);
    const [mapExtent] = useObjectState(mapExtentProp);

    useEffect(() => {
        setMapStore(() => {
            if (mapStoreProp) {
                return mapStoreProp;
            } else {
                return createMapAdapter({
                    viewOptions: { projection: `EPSG:${mapSRSId}` },
                });
            }
        });

        return () => {
            setMapStore((prev) => {
                if (!mapStoreProp && prev?.olMap) {
                    prev?.olMap.dispose();
                }
                return null;
            });
        };
    }, [mapSRSId, mapStoreProp]);

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

    return { mapStore };
}
