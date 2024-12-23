import type React from "react";

import type ShadowDisplay from "../compat/ShadowDisplay";

export * from "./DisplayConfig";
export * from "./DojoDisplay";

export interface BasePanelProps {
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

export type ReactPanelProps<T = unknown> = BasePanelProps & T;
