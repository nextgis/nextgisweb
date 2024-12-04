/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="dojo/dijit" />

import type Feature from "ol/Feature";
import type OlControl from "ol/control/Control";
import type { Options } from "ol/control/Control";
import type { Extent } from "ol/extent";

import type {
    CustomItemFileWriteStore,
    StoreItem,
} from "../compat/CustomItemFileWriteStore";
import type { LoggedDeferred } from "../compat/LoggedDeferred";
import type { MapStatesObserver } from "../map-state-observer/MapStatesObserver";
import type MapToolbar from "../map-toolbar";
import type { ToggleControl } from "../map-toolbar/ToggleControl";
import type { Map } from "../ol/Map";
import type { BaseLayer } from "../ol/layer/_Base";
import type PanelsManager from "../panels-manager";
import type { PluginBase } from "../plugin/PluginBase";
import type WebmapStore from "../store";
import type { VisibleMode } from "../store/annotations/AnnotationsStore";
import type { WebMapTab } from "../webmap-tabs/WebMapTabsStore";

import type { DisplayConfig } from "./DisplayConfig";
import type { LayerItemConfig, TreeItemConfig } from "./TreeItems";
import type { WebmapItem } from "./WebmapItem";
import type { WebMapSettings } from "./WebmapSettings";

import type { PanelDojoItem } from ".";

export interface HighlightFeatureData {
    geom: string;
    featureId: number;
    layerId: number;
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
    activate: () => void;
    deactivate: () => void;
}

export interface TabContainer {
    addTab(tab: WebMapTab): void;
}

export type MapControl = OlControl | dijit._WidgetBase | DojoDisplayIdentify;

export type WebmapAdapter = any;

export interface MapURLParams {
    lon?: string;
    lat?: string;
    base?: string;
    zoom?: string;
    angle?: string;
    annot?: VisibleMode;
    events?: "true";
    panel?: string;
    panels?: string;
    styles?: string;
    hl_val?: string;
    hl_lid?: string;
    hl_attr?: string;
    linkMainMap?: "true";
}

type ConfigMap = {
    itemConfig: LayerItemConfig;
};

export interface TinyConfig {
    mainDisplayUrl: string;
}

export type MapPlugin = new (val: PluginParams) => PluginBase;

export interface DojoDisplay extends dijit._WidgetBase {
    leftPanelPane: PanelDojoItem;
    navigationMenuPane: dijit.layout.ContentPane;
    mainContainer: dijit.layout.BorderContainer;
    mapContainer: dijit.layout.BorderContainer;
    mapPane: dijit.layout.ContentPane;
    mapNode: HTMLElement;

    config: DisplayConfig;
    tinyConfig: TinyConfig;
    clientSettings: WebMapSettings;
    identify: DojoDisplayIdentify;
    featureHighlighter: FeatureHighlighter;
    getUrlParams: () => Record<string, string>;
    isTinyMode: () => boolean;
    isTinyModePlugin: (plugin: string) => boolean;
    prepareItem: (item: WebmapItem) => WebmapItem;
    _installPlugins: (plugins: Record<string, PluginBase>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _onNewStoreItem: (item: WebmapItem | any) => void;
    _mapAddLayer: (id: number) => void;
    _mapDeferred: LoggedDeferred;
    _zoomToInitialExtent: () => void;
    _mapExtentDeferred: LoggedDeferred;
    _urlParams: Record<keyof MapURLParams, string>;

    _mid: Record<string, any>;
    _midDeferred: Record<string, LoggedDeferred>;
    _layersDeferred: LoggedDeferred;
    _postCreateDeferred: LoggedDeferred;
    _startupDeferred: LoggedDeferred;
    _itemStoreDeferred: LoggedDeferred;
    _extent_const: Extent;
    _extent: Extent;
    _layer_order: number[];
    tiny: boolean;
    _identifyFeatureByAttrValue: () => void;

    // The Item is now editable. Or not. Who knows?
    item: StoreItem;

    get<T extends keyof ConfigMap | string>(
        name: T
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): T extends keyof ConfigMap ? ConfigMap[T] : any;

    _layersSetup: () => void;
    handleSelect: (selectedKeys: number[]) => void;
    setLayerZIndex: (id: number, zIndex: number) => void;
    _switchBasemap: (basemapLayerKey: string) => void;
    _getActiveBasemapKey: () => string;
    dumpItem: () => TreeItemConfig;
    getVisibleItems: () => Promise<StoreItem[]>;

    tabContainer: TabContainer;

    _itemConfigById: Record<string, TreeItemConfig>;

    panelsManager: PanelsManager;

    _baseLayer: BaseLayer;

    itemStore: CustomItemFileWriteStore;
    getItemConfig: () => ItemConfigById;
    webmapStore: WebmapStore;
    mapStates: MapStatesObserver;

    map: Map;

    displayProjection: string;
    lonlatProjection: string;

    mapToolbar: MapToolbar;
    _mapAddControls: (controls: MapControl[]) => void;
    _plugins: Record<string, PluginBase>;

    leftTopControlPane: HTMLDivElement;
    leftBottomControlPane: HTMLDivElement;
    rightTopControlPane: HTMLDivElement;
    rightBottomControlPane: HTMLDivElement;

    /**
     * @deprecated use webmapStore.getlayers() instead
     */
    _layers: Record<number, BaseLayer>;

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
    nodeData: LayerItemConfig;
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
