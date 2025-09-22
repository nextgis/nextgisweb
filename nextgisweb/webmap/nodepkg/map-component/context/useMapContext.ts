import { createContext, useContext } from "react";

import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

export interface MapContextValue {
    mapStore: MapStore;
}

export const MapContext = createContext<MapContextValue | null>(null);

export function useMapContext(): MapContextValue {
    const context = useContext(MapContext);
    if (context === null) {
        throw new Error(
            "No context provided: useMapContext() can only be used in a descendant of <MapComponent>"
        );
    }
    return context;
}
