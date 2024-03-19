import type { DojoDisplay, MapControl, MapTool } from "../type";

export interface ControlBase<T> {
    ctor: (display: DojoDisplay) => T;
    key: string;
    label?: string;
    embeddedShowMode?: "always" | "customize";
    mapStateKey?: string;
}

export interface ControlInfo extends ControlBase<MapControl> {
    olMapControl: boolean;
    postCreate?: (display: DojoDisplay, control: MapControl) => void;
}

export interface ToolInfo extends ControlBase<MapTool> {}

export type ControlsInfo = ControlInfo | ToolInfo;
type Control = MapControl | MapTool;

export interface ControlReady {
    info: ControlsInfo;
    control: Control;
}
