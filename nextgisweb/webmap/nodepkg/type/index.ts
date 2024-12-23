import type Feature from "ol/Feature";
import type OlControl from "ol/control/Control";
import type React from "react";

import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { Adapter } from "../Adapter";
import type { CustomItemFileWriteStore } from "../compat/CustomItemFileWriteStore";
import type { Display } from "../display";
import type { ToolBase } from "../map-controls/tool/ToolBase";
import type { Map } from "../ol/Map";
import type { CoreLayer, LayerOptions } from "../ol/layer/_Base";
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
    [key: string]: typeof Adapter;
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

export type WebmapAdapter = any;

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
    map: Map;
    active?: boolean;
}

export interface BasePanelMeta {
    display?: Display;
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
