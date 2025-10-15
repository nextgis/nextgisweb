import type { ViewOptions } from "ol/View";
import { get as getProjection } from "ol/proj";
import { useCallback, useEffect, useMemo, useRef } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import {
    addBaselayer,
    prepareBaselayerConfig,
} from "@nextgisweb/basemap/util/baselayer";
import { useObjectState } from "@nextgisweb/gui/hook";
import { convertWSENToNgwExtent } from "@nextgisweb/gui/util/extent";
import type { MapExtent, MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type QuadKey from "@nextgisweb/webmap/ol/layer/QuadKey";
import type XYZ from "@nextgisweb/webmap/ol/layer/XYZ";
import type { ExtentWSEN } from "@nextgisweb/webmap/type/api";

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
    const baseRef = useRef<QuadKey | XYZ | undefined>(undefined);

    const [center] = useObjectState(centerProp);
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

    const mapStore = useMemo(() => {
        if (mapStoreProp) {
            return mapStoreProp;
        } else {
            return createMapAdapter({
                viewOptions: { projection: `EPSG:${mapSRSId}` },
            });
        }
    }, [mapSRSId, mapStoreProp]);

    useEffect(() => {
        return () => {
            if (!mapStoreProp && mapStore?.olMap) {
                mapStore.olMap.dispose();
            }
        };
    }, [mapStore, mapStoreProp]);

    const setView = useCallback((): void => {
        if (!mapStore.olMap) return;

        const curView = mapStore.olMap.getView();

        if (minZoom !== undefined) {
            curView.setMinZoom(minZoom);
        }
        if (maxZoom !== undefined) {
            curView.setMaxZoom(maxZoom);
        }

        if (effectiveExtent) {
            mapStore.fitNGWExtent(effectiveExtent);
        } else {
            if (center) {
                curView.setCenter(center);
            }
            if (zoom !== undefined) {
                curView.setZoom(zoom);
            }
        }
    }, [mapStore, center, zoom, minZoom, maxZoom, effectiveExtent]);

    useEffect(() => {
        if (mapStore.started) {
            setView();
        }
    }, [mapStore.started, setView]);

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
