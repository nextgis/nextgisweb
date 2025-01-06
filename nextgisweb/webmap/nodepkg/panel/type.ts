import type { MapStatesObserver } from "../map-state-observer/MapStatesObserver";
import type { DojoDisplay, PanelClsParams } from "../type";

export interface PanelProps extends PanelClsParams {
    display: DojoDisplay;
    title: string;
    mapStates: MapStatesObserver;
    close: () => void;
    visible: boolean;
}
