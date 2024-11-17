import type { DojoDisplay, PanelClsParams } from "../type";
import type { MapStatesObserver } from "../type/MapState";

export interface PanelProps extends PanelClsParams {
    display: DojoDisplay;
    title: string;
    mapStates: MapStatesObserver;
    close: () => void;
    visible: boolean;
}
