import type React from "react";

import type ShadowDisplay from "../compat/ShadowDisplay";

export * from "./DisplayConfig";
export * from "./ShadowDisplay";

export interface BasePanelMeta {
    display?: ShadowDisplay;
    menuIcon: React.ReactNode;
    name: string;
    order: number;
    title: string;
    splitter?: boolean;
    applyToTinyMap?: boolean;
    enabled?: boolean;
    key?: string;
}

export type PanelMeta<T = unknown> = BasePanelMeta & T;
