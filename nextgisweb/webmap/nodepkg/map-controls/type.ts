import type { DojoDisplay, MapControl, MapTool } from "../type";

export interface ControlBase<T> {
    constructor: (display: DojoDisplay) => T;
    urlKey?: string;
    label?: string;
    embeddedShowMode?: "always" | "customize";
}

export interface ControlInfo extends ControlBase<MapControl> {}

export interface ToolInfo extends ControlBase<MapTool> {
    mapStateKey: string;
}
