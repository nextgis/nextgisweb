/// <reference types="dojo/dijit" />

import type { ReactAppReturn } from "@nextgisweb/gui/react-app";

import type { ReactPanelComponentPropType } from "../panels-manager/type";
import type reactPanel from "../ui/react-panel";

import type { DojoDisplay } from "./DojoDisplay";
import type { TreeItem } from "./TreeItems";

export * from "./DisplayConfig";
export * from "./DojoDisplay";
export * from "./WebmapItem";
export * from "./WebmapLayer";
export * from "./WebmapPlugin";

export interface DojoItem {
    set: (key: string, value: unknown) => void;
    domNode: HTMLElement;
    on?: (eventName: string, callback: (panel: PanelDojoItem) => void) => void;
    addChild: (child: DojoItem) => void;
    get: (val: string) => unknown;
    removeChild: (elem: PanelDojoItem) => void;
}

export type StoreItem = dojo.data.api.Item & TreeItem;

export interface WebmapItem {
    checked: boolean;
    id: number;
    identifiable: boolean;
    label: string;
    layerId: number;
    position: unknown;
    styleId: number;
    type: string;
    visibility: boolean;
    symbols: string[];
}

export interface CustomItemFileWriteStore extends dojo.data.ItemFileWriteStore {
    dumpItem: (item: StoreItem) => WebmapItem;
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
}

export interface AddpanelItem {
    cls: ReturnType<typeof reactPanel>;
    params: ReactPanelProps;
}

export interface PanelDojoItem<
    P extends ReactPanelComponentPropType = ReactPanelComponentPropType,
> extends DojoItem {
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
