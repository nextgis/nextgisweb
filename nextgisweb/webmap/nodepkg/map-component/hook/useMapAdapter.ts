import View from "ol/View";
import type { FitOptions, ViewOptions } from "ol/View";
import { fromExtent } from "ol/geom/Polygon";
import TileLayer from "ol/layer/Tile";
import { transformExtent } from "ol/proj";
import OSM from "ol/source/OSM";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { useObjectState } from "@nextgisweb/gui/hook";
import type { SRSRef } from "@nextgisweb/spatial-ref-sys/type/api";
import { MapStore } from "@nextgisweb/webmap/ol/MapStore";

export interface MapExtent extends FitOptions {
    extent: NgwExtent;
    srs: SRSRef;
}

export interface MapProps extends ViewOptions {
    mapSRS?: SRSRef;
    osm?: boolean;
    mapExtent?: MapExtent;
}

export function useMapAdapter({
    center: centerProp,
    mapSRS = { id: 3857 },
    zoom,
    osm = true,
    minZoom,
    maxZoom,
    mapExtent: mapExtentProp,
}: MapProps) {
    const [mapStore, setMapStore] = useState<MapStore>();
    const osmLayer = useRef<TileLayer<OSM>>();

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

        if (center) {
            curView.setCenter(center);
        }
        if (zoom !== undefined) {
            curView.setZoom(zoom);
        }
        if (minZoom !== undefined) {
            curView.setMinZoom(minZoom);
        }
        if (maxZoom !== undefined) {
            curView.setMaxZoom(maxZoom);
        }

        if (mapExtent) {
            const { extent, srs, ...fitOptions } = mapExtent;
            const bbox = [
                extent.minLon,
                extent.minLat,
                extent.maxLon,
                extent.maxLat,
            ];
            curView.fitInternal(
                fromExtent(
                    transformExtent(bbox, `EPSG:${srs.id}`, `EPSG:${mapSRS.id}`)
                ),
                fitOptions
            );
        }
    }, [mapStore, center, zoom, minZoom, maxZoom, mapExtent, mapSRS.id]);

    useEffect(() => {
        setView();
    }, [setView]);

    useEffect(() => {
        if (mapStore && osm) {
            const osmLayer_ = new TileLayer({
                source: new OSM(),
                zIndex: -1,
            });
            mapStore.olMap.addLayer(osmLayer_);
            osmLayer.current = osmLayer_;
        }
        return () => {
            if (osmLayer.current) {
                osmLayer.current.dispose();
            }
        };
    }, [osm, mapStore]);

    useEffect(() => {
        return () => {
            if (mapStore?.olMap) {
                mapStore.olMap.dispose();
            }
        };
    }, [mapStore]);

    return { createMapAdapter };
}
