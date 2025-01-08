/// <reference types="dojo/dijit" />

import type Feature from "ol/Feature";
import type { Control as OlControl } from "ol/control";
import type { Options } from "ol/control/Control";

import type { MapStatesObserver } from "../map-state-observer/MapStatesObserver";
import type MapToolbar from "../map-toolbar";
import type { ToggleControl } from "../map-toolbar/ToggleControl";
import type { Map } from "../ol/Map";
import type PanelsManager from "../panels-manager";
import type WebmapStore from "../store";
import type { WebMapTab } from "../webmap-tabs/WebMapTabsStore";

import type { DisplayConfig } from "./DisplayConfig";
import type { LayerItem, TreeItem } from "./TreeItems";
import type { WebmapItem } from "./WebmapItem";
import type { WebmapLayer } from "./WebmapLayer";
import type { WebmapPlugin } from "./WebmapPlugin";

export interface HighlightFeatureData {
    geom: string;
    featureId: number;
    layerId: number;
}

export type StoreItem = dojo.data.api.Item;

export interface CustomItemFileWriteStore extends dojo.data.ItemFileWriteStore {
    dumpItem: (item: StoreItem) => WebmapItem;
}

export interface FeatureHighlighter {
    highlightFeature: (data: HighlightFeatureData) => void;
    getHighlighted: () => Feature[];
    unhighlightFeature: (filter: (feature: Feature) => boolean) => void;
    highlightFeatureById: (
        featureId: number,
        layerId: number
    ) => PromiseLike<Feature>;
}

export interface WebmapItemConfig extends WebmapItem {
    plugin?: Record<string, unknown>;
    label: string;
}

export interface ItemConfigById {
    [key: number]: WebmapItemConfig;
}

export interface MapTool extends dijit._WidgetBase {
    activate: () => void;
    deactivate: () => void;

    label: string;
    iconClass?: string;
    customCssClass?: string;
    customIcon?: string;
    toolbarBtn?: ToggleControl;
}

interface DojoDisplayIdentifyPopup {
    widget?: DojoDisplayIdentify;
}

export interface DojoDisplayIdentify {
    _popup: DojoDisplayIdentifyPopup;
    identifyFeatureByAttrValue: (
        layerId: number,
        attribute: string,
        value: string | number | boolean,
        zoom?: number
    ) => PromiseLike<boolean>;
    reset: () => void;
}

export interface TabContainer {
    addTab(tab: WebMapTab): void;
}

export type MapControl = OlControl | dijit._WidgetBase | DojoDisplayIdentify;

export type WebmapAdapter = any;

type ConfigMap = {
    itemConfig: LayerItem;
};

export interface DojoDisplay extends dijit._WidgetBase {
    config: DisplayConfig;
    identify: DojoDisplayIdentify;
    featureHighlighter: FeatureHighlighter;
    getUrlParams: () => Record<string, string>;
    isTinyMode: () => boolean;
    isTinyModePlugin: (plugin: string) => boolean;
    prepareItem: (item: WebmapItem) => WebmapItem;
    _installPlugins: (plugins: Record<string, WebmapPlugin>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _onNewStoreItem: (item: WebmapItem | any) => void;
    _mapAddLayer: (id: number) => void;
    _mapDeferred: PromiseLike<void>;
    _zoomToInitialExtent: () => void;
    _mapExtentDeferred: PromiseLike<void>;
    _urlParams: Record<string, string>;

    _layersDeferred: Promise<void>;

    tiny: boolean;

    item: { id: number };

    get<T extends keyof ConfigMap | string>(
        name: T
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): T extends keyof ConfigMap ? ConfigMap[T] : any;

    handleSelect: (selectedKeys: number[]) => void;
    setLayerZIndex: (id: number, zIndex: number) => void;
    _switchBasemap: (basemapLayerKey: number) => void;
    _getActiveBasemapKey: () => number;
    dumpItem: () => TreeItem;
    getVisibleItems: () => Promise<TreeItem[]>;

    tabContainer: TabContainer;

    _itemConfigById: Record<number, TreeItem>;

    panelsManager: PanelsManager;

    _baseLayer: WebmapLayer;

    itemStore: CustomItemFileWriteStore;
    getItemConfig: () => ItemConfigById;
    webmapStore: WebmapStore;
    mapStates: MapStatesObserver;

    map: Map;
    mapContainer: dijit.layout.BorderContainer;
    displayProjection: string;

    mapToolbar: MapToolbar;
    _mapAddControls: (controls: MapControl[]) => void;
    _plugins: Record<string, WebmapPlugin>;

    leftTopControlPane: HTMLDivElement;
    leftBottomControlPane: HTMLDivElement;
    rightTopControlPane: HTMLDivElement;
    rightBottomControlPane: HTMLDivElement;

    /**
     * @deprecated use webmapStore.getlayers() instead
     */
    _layers: Record<number, WebmapLayer>;

    _adapters: Record<string, WebmapAdapter>;
}

export interface PluginMenuItem {
    icon: string;
    title: string;
    onClick: () => void;
}

export interface PluginParams {
    identity: string;
    display: DojoDisplay;
    itemStore: CustomItemFileWriteStore | boolean;
}

export interface PluginState {
    enabled: boolean;
    nodeData: LayerItem;
    map: Map;
    active?: boolean;
}

export interface Plugin {
    postCreate: () => void;
    startup: () => void;
}

export interface ControlOption extends Options {
    display: DojoDisplay;
    tipLabel: string;
}
