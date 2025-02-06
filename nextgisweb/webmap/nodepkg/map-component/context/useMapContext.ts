import { createContext, useContext } from "react";

import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

export interface MapAdapterRef {
    mapStore?: MapStore;
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
