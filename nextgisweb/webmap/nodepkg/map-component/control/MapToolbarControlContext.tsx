import { createContext, useContext } from "react";

import type { MapControlProps } from "./MapControl";

export type Direction = "horizontal" | "vertical";

export interface MapToolbarContextValue {
    position?: MapControlProps["position"];

    direction: Direction;
}

export const MapToolbarControlContext =
    createContext<MapToolbarContextValue | null>(null);

export function useMapToolbarControl(): MapToolbarContextValue | null {
    const ctx = useContext(MapToolbarControlContext);

    return ctx;
}
