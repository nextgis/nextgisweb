/// <reference types="dojo/dijit" />

import type { DojoDisplay } from "./DojoDisplay";

export * from "./DisplayConfig";
export * from "./DojoDisplay";
export * from "./WebmapItem";
export * from "./WebmapLayer";
export * from "./WebmapPlugin";

export interface DojoItem extends HTMLElement {
    set: (key: string, value: unknown) => void;
    domNode: HTMLElement;
    on?: (eventName: string, callback: (panel: PanelDojoItem) => void) => void;
    addChild: (child: DojoItem) => void;
    get: (val: string) => unknown;
}

export type StoreItem = dojo.data.api.Item;

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
}

export interface CustomItemFileWriteStore extends dojo.data.ItemFileWriteStore {
    dumpItem: (item: StoreItem) => WebmapItem;
}

export interface MapStateControl {
    activate: () => void;
    deactivate: () => void;
}

export interface MapStatesObserver {
    addState: (
        state: string,
        control?: MapStateControl,
        activate?: boolean
    ) => void;
    removeState: (state: string) => void;
    activateState: (state: string) => boolean;
    deactivateState: (state: string) => boolean;
    setDefaultState: (state: string, activate?: boolean) => void;
    activateDefaultState: () => void;
    getActiveState: () => string;
}

export interface DojoDisplay extends dijit._WidgetBase {
    identify: DojoDisplayIdentify;
    featureHighlighter: FeatureHighlighter;
    map: DisplayMap;
    mapStates: MapStatesObserver;
    mapContainer: dijit.layout.BorderContainer;
    displayProjection: string;
    config: DisplayConfig;
    itemStore: CustomItemFileWriteStore;
    webmapStore: WebmapStore;
    /**
     * @deprecated use webmapStore.getlayers() instead
     */
    _layers: Record<number, WebmapLayer>;
}

export interface PanelClsParams {
    display: DojoDisplay;
    menuIcon: string;
    name: string;
    order: number;
    title: string;
    splitter: boolean;
}

export interface PanelDojoItem extends DojoItem {
    name: string;
    menuIcon?: string;
    title: string;

    order?: number;
    cls?: new (params: PanelClsParams) => PanelDojoItem;
    params: PanelClsParams;

    isFullWidth?: boolean;
    show: () => void;
    hide: () => void;
}
