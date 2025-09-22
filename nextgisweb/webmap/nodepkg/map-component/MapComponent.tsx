import { observer } from "mobx-react-lite";
import type { ViewOptions } from "ol/View";
import { useEffect, useRef } from "react";
import type React from "react";

import { assert } from "@nextgisweb/jsrealm/error";
import type { MapExtent, MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { MapContext } from "./context/useMapContext";
import { ToggleGroup } from "./control/toggle-group/ToggleGroup";
import { useMapAdapter } from "./hook/useMapAdapter";

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
    initialMapExtent?: MapExtent;
    resetView?: boolean;
    showZoomLevel?: boolean;
    whenCreated?: (mapStore: MapStore | null) => void;
}

export const MapComponent = observer(
    ({
        zoom = 0,
        style,
        center = [0, 0],
        basemap,
        maxZoom,
        mapStore: mapStoreProp,
        children,
        className,
        mapExtent,
        whenCreated,
    }: MapComponentProps) => {
        const { mapStore } = useMapAdapter({
            zoom,
            center,
            basemap,
            maxZoom,
            mapStore: mapStoreProp,
            mapExtent,
        });

        const mapContainerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            let observer: ResizeObserver | undefined = undefined;
            if (mapStore) {
                assert(mapContainerRef.current);

                const target = mapContainerRef.current;

                mapStore.startup(target).then(() => {
                    if (whenCreated) {
                        whenCreated(mapStore);
                    }

                    observer = new ResizeObserver(() => {
                        mapStore.updateSize();
                    });
                    observer.observe(target);
                });
            }

            return () => {
                if (observer) {
                    observer.disconnect();
                }
                mapStore?.detach();
            };
        }, [mapStore, whenCreated]);

        if (!mapStore) {
            return null;
        }

        const { mapState, defaultMapState, setMapState, setDefaultMapState } =
            mapStore;

        return (
            <ToggleGroup
                value={mapState}
                defaultValue={defaultMapState}
                onDefaultChange={setDefaultMapState}
                onChange={setMapState}
            >
                <MapContext value={{ mapStore }}>
                    <div
                        ref={mapContainerRef}
                        style={style}
                        className={className}
                    >
                        {children}
                    </div>
                </MapContext>
            </ToggleGroup>
        );
    }
);

MapComponent.displayName = "MapComponent";
