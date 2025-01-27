import type Feature from "ol/Feature";
import type OlControl from "ol/control/Control";

import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { LayerDisplayAdapterCtor } from "../DisplayLayerAdapter";
import type { CustomItemFileWriteStore } from "../compat/CustomItemFileWriteStore";
import type { Display } from "../display";
import type { ToolBase } from "../map-controls/tool/ToolBase";
import type { MapStore } from "../ol/MapStore";
import type { CoreLayer, LayerOptions } from "../ol/layer/CoreLayer";
import type { PluginBase } from "../plugin/PluginBase";
import type { AnnotationVisibleMode } from "../store/annotations/AnnotationsStore";

export * from "./DisplayConfig";

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

// use this wrapper because BaseLayer is abstract class
export type BaseLayerConstructor = new (
    name: string,
    layerOptions: LayerOptions,
    sourceOptions?: unknown
) => CoreLayer;

export interface BasemapModules {
    [key: string]: BaseLayerConstructor;
}

export interface AdapterModules {
    [key: string]: LayerDisplayAdapterCtor;
}

export interface PluginModules {
    [key: string]: MapPlugin;
}

export interface WMPluginModules {
    [key: string]: MapPlugin;
}

export interface Mid {
    basemap: BasemapModules;
    adapter: AdapterModules;
    plugin: PluginModules;
    wmplugin: WMPluginModules;
}

export type MapControl = OlControl | ToolBase;

export interface MapRefs {
    target: HTMLElement;
    leftTopControlPane: HTMLElement;
    leftBottomControlPane: HTMLElement;
    rightTopControlPane: HTMLElement;
    rightBottomControlPane: HTMLElement;
}

export interface MapURLParams {
    lon?: string;
    lat?: string;
    base?: string;
    zoom?: string;
    angle?: string;
    annot?: AnnotationVisibleMode;
    events?: "true";
    panel?: string;
    panels?: string;
    styles?: string;
    hl_val?: string;
    hl_lid?: string;
    hl_attr?: string;
    controls?: string;
    linkMainMap?: "true";
}

export interface TinyConfig {
    mainDisplayUrl: string;
}

export type MapPlugin = new (val: PluginParams) => PluginBase;

export interface PluginMenuItem {
    icon: string;
    title: string;
    onClick: () => void;
}

export interface PluginParams {
    identity: string;
    display: Display;
    itemStore: CustomItemFileWriteStore | boolean;
}

export interface PluginState {
    enabled: boolean;
    nodeData: LayerItemConfig;
    map: MapStore;
    active?: boolean;
}
