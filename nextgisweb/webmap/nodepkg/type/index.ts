/// <reference types="dojo/dijit" />

import type { ReactAppReturn } from "@nextgisweb/gui/react-app";

import type { ReactPanelComponentPropType } from "../panels-manager/type";
import type reactPanel from "../ui/react-panel";

import type { DojoDisplay } from "./DojoDisplay";

export * from "./DisplayConfig";
export * from "./DojoDisplay";
export * from "./WebmapItem";

export interface DojoItem {
    set: (key: string, value: unknown) => void;
    domNode: HTMLElement;
    on?: (eventName: string, callback: (panel: PanelDojoItem) => void) => void;
    addChild: (child: DojoItem) => void;
    get: (val: string) => unknown;
    removeChild: (elem: PanelDojoItem) => void;
}

export interface PanelClsParams {
    display: DojoDisplay;
    applyToTinyMap?: boolean;
    menuIcon: string;
    name: string;
    order: number;
    title: string;
}

export interface ReactPanelProps {
    menuIcon: string;
    name: string;
    order: number;
    title: string;
    splitter?: boolean;
    applyToTinyMap?: boolean;
}

export interface AddpanelItem {
    cls: ReturnType<typeof reactPanel>;
    params: ReactPanelProps;
}

export interface PanelDojoItem<
    P extends ReactPanelComponentPropType = ReactPanelComponentPropType,
> extends dijit.layout.ContentPane {
    display: DojoDisplay;
    name: string;
    menuIcon?: string;
    title: string;

    order?: number;
    cls?: ReturnType<typeof reactPanel>;
    params: PanelClsParams;

    isFullWidth?: boolean;
    show: () => void;
    hide: () => void;

    applyToTinyMap?: boolean;

    app?: ReactAppReturn<P>;
    props?: Record<string, unknown>;
}
