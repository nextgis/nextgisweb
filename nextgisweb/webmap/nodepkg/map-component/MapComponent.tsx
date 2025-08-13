import type { ViewOptions } from "ol/View";
import { useEffect, useRef } from "react";
import type React from "react";

import { assert } from "@nextgisweb/jsrealm/error";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { MapContext } from "./context/useMapContext";
import { useMapAdapter } from "./hook/useMapAdapter";
import type { MapExtent } from "./hook/useMapAdapter";

import "ol/ol.css";
import "./MapComponent.less";

export interface MapComponentProps extends ViewOptions {
    style?: React.CSSProperties;
    target?: string;
    basemap?: boolean;
    children?: React.ReactNode;
    mapStore?: MapStore;
    className?: string;
    mapExtent?: MapExtent;
    resetView?: boolean;
    showZoomLevel?: boolean;
    whenCreated?: (mapStore: MapStore | null) => void;
}

export function MapComponent({
    zoom = 0,
    style,
    center = [0, 0],
    basemap,
    mapStore: mapStoreProp,
    children,
    className,
    mapExtent,
    whenCreated,
    ...props
}: MapComponentProps) {
    const { mapStore } = useMapAdapter({
        zoom,
        center,
        basemap,
        mapStore: mapStoreProp,
        mapExtent,
    });

    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let observer: ResizeObserver | undefined = undefined;
        assert(mapContainerRef.current);

        mapStore.startup(mapContainerRef.current).then(() => {
            if (whenCreated) {
                whenCreated(mapStore);
            }

            observer = new ResizeObserver(() => {
                mapStore.updateSize();
            });
            observer.observe(mapStore.getTargetElement());
        });

        return () => {
            if (observer) {
                observer.disconnect();
            }
        };
    }, [mapStore, whenCreated]);

    return (
        <MapContext value={{ mapStore }}>
            <div
                ref={mapContainerRef}
                style={style}
                className={className}
                {...props}
            >
                {children}
            </div>
        </MapContext>
    );
}
