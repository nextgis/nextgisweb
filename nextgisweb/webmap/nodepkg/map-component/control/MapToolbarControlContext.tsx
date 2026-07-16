import { createContext, use } from "react";

import type { MapControlProps } from "./MapControl";

export type Direction = "horizontal" | "vertical";

export interface MapToolbarContextValue {
  position?: MapControlProps["position"];

  direction: Direction;
}

export const MapToolbarControlContext =
  createContext<MapToolbarContextValue | null>(null);
MapToolbarControlContext.displayName = "MapToolbarControlContext";

export function useMapToolbarControl(): MapToolbarContextValue | null {
  const ctx = use(MapToolbarControlContext);

  return ctx;
}
