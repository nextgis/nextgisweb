import type { ToggleControl } from "../map-toolbar/ToggleControl";
import type { DojoDisplay, MapControl } from "../type";

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

export interface Tool {
    activate: () => void;
    deactivate: () => void;

    destroy?: () => void;

    label: string;
    iconClass?: string;
    customCssClass?: string;
    customIcon?: string;
    toolbarBtn?: ToggleControl;
}

export interface ToolInfo extends ControlBase<Tool> {}

export type ControlsInfo = ControlInfo | ToolInfo;
type Control = MapControl | Tool;

export interface ControlReady {
    info: ControlsInfo;
    control: Control;
}
