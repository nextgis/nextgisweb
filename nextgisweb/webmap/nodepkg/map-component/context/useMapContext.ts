import { createContext, useContext } from "react";

import type { MapAdapter } from "@nextgisweb/webmap/ol/MapAdapter";

export interface MapAdapterRef {
    mapAdapter?: MapAdapter;
}

export const MapContext = createContext<MapAdapterRef | null>(null);

export const MapProvider = MapContext.Provider;

export function useMapContext(): MapAdapterRef {
    const context = useContext(MapContext);
    if (context === null) {
        throw new Error(
            "No context provided: useMapContext() can only be used in a descendant of <MapComponent>"
        );
    }
    return context;
}
