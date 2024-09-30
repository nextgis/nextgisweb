import type { ViewOptions } from "ol/View";
import {
    StrictMode,
    createContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import type React from "react";

import type { MapAdapter } from "@nextgisweb/webmap/ol/MapAdapter";
import "ol/ol.css";
import "./MapComponent.less";

import { Control } from "./Control";
import { useAdapter } from "./hook/useAdapter";
import type { MapExtent } from "./hook/useAdapter";

import PhotosphereIcon from "@nextgisweb/icon/material/panorama_photosphere";

interface MapComponentProps extends ViewOptions {
    children?: React.ReactNode;
    target?: string;
    style?: React.CSSProperties;
    osm?: boolean;
    whenCreated?: (olMap: MapAdapter | null) => void;
    mapExtent?: MapExtent;
    resetView?: boolean;
}

interface MapRef {
    adapter?: MapAdapter;
}

export const MapContext = createContext<MapRef>({
    adapter: undefined,
});

export function MapComponent({
    children,
    style,
    osm,
    zoom = 0,
    center = [0, 0],
    mapExtent,
    whenCreated,
    ...props
}: MapComponentProps) {
    const [adapter, setAdapter] = useState<MapAdapter>();

    const { createAdapter } = useAdapter({
        center,
        zoom,
        mapExtent,
        osm,
    });

    const mapContainerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (mapContainerRef.current) {
            if (!adapter) {
                const adapter_ = createAdapter({
                    target: mapContainerRef.current,
                });
                setAdapter(adapter_);
            }
        } else {
            throw new Error("Unreachable");
        }
    }, [createAdapter, whenCreated, adapter]);

    useEffect(() => {
        if (whenCreated && adapter) {
            whenCreated(adapter);
        }
    }, [whenCreated, adapter]);

    return (
        <StrictMode>
            <MapContext.Provider value={{ adapter }}>
                <div className="map-container" style={{ ...style }}>
                    <Control
                        position="top-left"
                        icon={<PhotosphereIcon />}
                        onClick={() => console.log("clicked!")}
                    />
                    <Control
                        position="top-left"
                        onClick={() => {
                            if (adapter?.map) {
                                const view = adapter.map.getView();
                                let zoom = view.getZoom();
                                if (zoom) {
                                    view.animate({
                                        zoom: (zoom += 1),
                                        duration: 250,
                                    });
                                }
                            }
                        }}
                    />
                    <div
                        ref={mapContainerRef}
                        style={{
                            height: "100%",
                            width: "100%",
                        }}
                        className="map"
                        {...props}
                    >
                        {children}
                    </div>
                </div>
            </MapContext.Provider>
        </StrictMode>
    );
}
