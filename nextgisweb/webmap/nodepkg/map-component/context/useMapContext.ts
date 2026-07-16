import { createContext, use } from "react";

import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

export interface MapContextValue {
  mapStore: MapStore;
}

export const MapContext = createContext<MapContextValue | null>(null);
MapContext.displayName = "MapContext";

export function useMapContext(): MapContextValue {
  const context = use(MapContext);
  if (context === null) {
    throw new Error(
      "No context provided: useMapContext() can only be used in a descendant of <MapComponent>"
    );
  }
  return context;
}
