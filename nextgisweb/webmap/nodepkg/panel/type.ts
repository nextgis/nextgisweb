import type { DojoDisplay } from "../type";
import type { MapStatesObserver } from "../type/MapState";

export interface PanelProps {
    display: DojoDisplay;
    title: string;
    mapStates: MapStatesObserver;
    close: () => void;
}
