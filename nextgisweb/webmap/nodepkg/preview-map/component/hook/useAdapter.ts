import View from "ol/View";
import type { ViewOptions } from "ol/View";
import { fromExtent } from "ol/geom/Polygon";
import TileLayer from "ol/layer/Tile";
import { transformExtent } from "ol/proj";
import OSM from "ol/source/OSM";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { useObjectState } from "@nextgisweb/gui/hook";
import type { SRSRef } from "@nextgisweb/spatial-ref-sys/type/api";
import { MapAdapter } from "@nextgisweb/webmap/ol/MapAdapter";

export interface MapExtent {
    extent: NgwExtent;
    srs: SRSRef;
}

export interface MapProps extends ViewOptions {
    mapSRS?: SRSRef;
    osm?: boolean;
    mapExtent?: MapExtent;
}

export function useAdapter({
    center: centerProp,
    mapSRS = { id: 3857 },
    zoom,
    osm = true,
    minZoom,
    maxZoom,
    mapExtent: mapExtentProp,
}: MapProps) {
    const [adapter, setAdapter] = useState<MapAdapter>();
    const osmLayer = useRef<TileLayer<OSM>>();

    const [center] = useObjectState(centerProp);
    const [mapExtent] = useObjectState(mapExtentProp);

    const createAdapter = useCallback(
        ({ target }: { target: HTMLElement | string }) => {
            const view = new View({
                projection: `EPSG:${mapSRS.id}`,
            });
            const adapter = new MapAdapter({
                target,
                view,
            });
            setAdapter(adapter);
            return adapter;
        },
        [mapSRS.id]
    );

    const setView = useCallback((): void => {
        if (!adapter?.map) return;

        const curView = adapter.map.getView();

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
            const bbox = [
                mapExtent.extent.minLon,
                mapExtent.extent.minLat,
                mapExtent.extent.maxLon,
                mapExtent.extent.maxLat,
            ];
            curView.fitInternal(
                fromExtent(
                    transformExtent(
                        bbox,
                        `EPSG:${mapExtent.srs.id}`,
                        `EPSG:${mapSRS.id}`
                    )
                )
            );
        }
    }, [adapter, center, zoom, minZoom, maxZoom, mapExtent, mapSRS.id]);

    useEffect(() => {
        setView();
    }, [setView]);

    useEffect(() => {
        if (adapter && osm) {
            const osmLayer_ = new TileLayer({
                source: new OSM(),
                zIndex: -1,
            });
            adapter.map.addLayer(osmLayer_);
            osmLayer.current = osmLayer_;
        }
        return () => {
            if (osmLayer.current) {
                osmLayer.current.dispose();
            }
        };
    }, [osm, adapter]);

    useEffect(() => {
        return () => {
            if (adapter?.map) {
                adapter.map.dispose();
            }
        };
    }, []);

    return { createAdapter };
}
