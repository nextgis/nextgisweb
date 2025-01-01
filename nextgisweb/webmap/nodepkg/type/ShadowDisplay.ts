import type Feature from "ol/Feature";
import type OlControl from "ol/control/Control";

import type { CustomItemFileWriteStore } from "../compat/CustomItemFileWriteStore";
import type ShadowDisplayCompat from "../compat/ShadowDisplay";
import type { ToolBase } from "../map-controls/tool/ToolBase";
import type { Map } from "../ol/Map";
import type { PluginBase } from "../plugin/PluginBase";
import type { VisibleMode } from "../store/annotations/AnnotationsStore";

import type { LayerItemConfig } from "./TreeItems";

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

export type MapControl = OlControl | ToolBase;

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
    controls?: string;
    linkMainMap?: "true";
}

export interface TinyConfig {
    mainDisplayUrl: string;
}

export type MapPlugin = new (val: PluginParams) => PluginBase;

export type ShadowDisplay = ShadowDisplayCompat;

export interface PluginMenuItem {
    icon: string;
    title: string;
    onClick: () => void;
}

export interface PluginParams {
    identity: string;
    display: ShadowDisplay;
    itemStore: CustomItemFileWriteStore | boolean;
}

export interface PluginState {
    enabled: boolean;
    nodeData: LayerItemConfig;
    map: Map;
    active?: boolean;
}
