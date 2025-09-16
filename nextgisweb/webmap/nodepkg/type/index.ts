import type Feature from "ol/Feature";

import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { LayerDisplayAdapterCtor } from "../DisplayLayerAdapter";
import type { CustomItemFileWriteStore } from "../compat/CustomItemFileWriteStore";
import type { LayerSymbols } from "../compat/type";
import type { Display } from "../display";
import type { MapStore } from "../ol/MapStore";
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
    adapter: AdapterModules;
    plugin: PluginModules;
    wmplugin: WMPluginModules;
}

export interface DisplayURLParams {
    lon?: number;
    lat?: number;
    base?: string;
    zoom?: number;
    angle?: number;
    annot?: AnnotationVisibleMode;
    events?: "true";
    panel?: string;
    panels?: string[];
    styles?: Record<number, LayerSymbols>;
    hl_val?: string;
    hl_lid?: number;
    hl_attr?: string;
    controls?: string[];
    linkMainMap?: "true";
}

export interface TinyConfig {
    mainDisplayUrl: string;
}

export type MapPlugin = new (val: PluginParams) => PluginBase;

export interface PluginMenuItem {
    icon: React.ReactNode;
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
