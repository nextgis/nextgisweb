import type { ViewOptions } from "ol/View";
import { useEffect, useRef } from "react";
import type React from "react";

import { assert } from "@nextgisweb/jsrealm/error";
import type { MapExtent, MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { MapContext } from "./context/useMapContext";
import { useMapAdapter } from "./hook/useMapAdapter";

import "ol/ol.css";
import "./MapComponent.less";

export interface MapComponentProps extends ViewOptions {
    children?: React.ReactNode;
    target?: string;
    style?: React.CSSProperties;
    basemap?: boolean;
    whenCreated?: (mapStore: MapStore | null) => void;
    mapExtent?: MapExtent;
    initialMapExtent?: MapExtent;
    resetView?: boolean;
    showZoomLevel?: boolean;
}

export function MapComponent({
    whenCreated,
    zoom = 0,
    style,
    center = [0, 0],
    basemap,
    maxZoom,
    children,
    mapExtent,
}: MapComponentProps) {
    const mapRef = useRef<MapStore | null>(null);
    const { createMapAdapter } = useMapAdapter({
        mapExtent,
        basemap,
        maxZoom,
        center,
        zoom,
    });

    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let observer: ResizeObserver | undefined = undefined;
        assert(mapContainerRef.current);
        if (!mapRef.current) {
            const adapter = createMapAdapter({
                target: mapContainerRef.current,
            });
            mapRef.current = adapter;
            if (whenCreated) {
                whenCreated(adapter);
            }
        }
        observer = new ResizeObserver(() => {
            mapRef.current?.updateSize();
        });
        observer.observe(mapRef.current.getTargetElement());
        return () => {
            if (observer) {
                observer.disconnect();
            }
        };
    }, [createMapAdapter, whenCreated]);

    return (
        <MapContext value={{ mapStore: mapRef.current }}>
            <div ref={mapContainerRef} style={style} className="map">
                {children}
            </div>
        </MapContext>
    );
}
