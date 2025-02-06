import type { ViewOptions } from "ol/View";
import { useEffect, useRef } from "react";
import type React from "react";

import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import "ol/ol.css";
import "./MapComponent.less";

import { MapProvider } from "./context/useMapContext";
import { useMapAdapter } from "./hook/useMapAdapter";
import type { MapExtent } from "./hook/useMapAdapter";

export interface MapComponentProps extends ViewOptions {
    children?: React.ReactNode;
    target?: string;
    style?: React.CSSProperties;
    basemap?: boolean;
    whenCreated?: (mapStore: MapStore | null) => void;
    mapExtent?: MapExtent;
    resetView?: boolean;
}

export function MapComponent({
    children,
    style,
    basemap: osm,
    zoom = 0,
    center = [0, 0],
    mapExtent,
    whenCreated,
    ...props
}: MapComponentProps) {
    const mapRef = useRef<MapStore>();
    const { createMapAdapter } = useMapAdapter({
        center,
        zoom,
        mapExtent,
        osm,
    });

    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let observer: ResizeObserver | undefined = undefined;
        if (mapContainerRef.current) {
            if (!mapRef.current) {
                const adapter = createMapAdapter({
                    target: mapContainerRef.current,
                });
                mapRef.current = adapter;
                if (whenCreated) {
                    whenCreated(adapter);
                }
            }
        } else {
            throw new Error("Unreachable");
        }
        if (mapRef.current) {
            observer = new ResizeObserver(() => {
                mapRef.current?.updateSize();
            });
            observer.observe(mapRef.current.getTargetElement());
        }
        return () => {
            if (observer) {
                observer.disconnect();
            }
        };
    }, [createMapAdapter, whenCreated]);

    return (
        <MapProvider value={{ mapStore: mapRef.current }}>
            <div ref={mapContainerRef} style={style} className="map" {...props}>
                {children}
            </div>
        </MapProvider>
    );
}
