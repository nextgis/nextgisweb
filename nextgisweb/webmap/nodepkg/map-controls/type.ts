import type { Control as OlControl } from "ol/control";

import type { Display } from "../display";

import type { ToolBase } from "./tool/ToolBase";

export interface ControlBase<T> {
    ctor: (display: Display) => T;
    key: string;
    label?: string;
    embeddedShowMode?: "always" | "customize";
    mapStateKey?: string;
}

export interface ControlInfo extends ControlBase<Control> {
    olMapControl: boolean;
    postCreate?: (display: Display, control: Control) => void;
}

export type ToolInfo = ControlBase<ToolBase>;

export type ControlsInfo = ControlInfo | ToolInfo;
type Control = OlControl | ToolBase;

export interface ControlReady {
    info: ControlsInfo;
    control: Control;
}
