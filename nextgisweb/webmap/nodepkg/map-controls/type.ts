import type { Control as OlControl } from "ol/control";

import type ShadowDisplay from "../compat/ShadowDisplay";

import type { ToolBase } from "./tool/ToolBase";

export interface ControlBase<T> {
    ctor: (display: ShadowDisplay) => T;
    key: string;
    label?: string;
    embeddedShowMode?: "always" | "customize";
    mapStateKey?: string;
}

export interface ControlInfo extends ControlBase<Control> {
    olMapControl: boolean;
    postCreate?: (display: ShadowDisplay, control: Control) => void;
}

export interface ToolInfo extends ControlBase<ToolBase> {}

export type ControlsInfo = ControlInfo | ToolInfo;
type Control = OlControl | ToolBase;

export interface ControlReady {
    info: ControlsInfo;
    control: Control;
}
