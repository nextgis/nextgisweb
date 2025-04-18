import type Feature from "ol/Feature";
import type OlControl from "ol/control/Control";

import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { LayerDisplayAdapterCtor } from "../DisplayLayerAdapter";
import type { CustomItemFileWriteStore } from "../compat/CustomItemFileWriteStore";
import type { Display } from "../display";
import type { ToolBase } from "../map-controls/tool/ToolBase";
import type { MapStore } from "../ol/MapStore";
import type { PluginBase } from "../plugin/PluginBase";
import type { AnnotationVisibleMode } from "../store/annotations/AnnotationsStore";
import { UrlParams } from "../utils/UrlParams";

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

export type MapControl = OlControl | ToolBase;

export interface MapRefs {
    target: HTMLElement;
    leftTopControlPane: HTMLElement;
    leftBottomControlPane: HTMLElement;
    rightTopControlPane: HTMLElement;
    rightBottomControlPane: HTMLElement;
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
    styles?: number[];
    hl_val?: string;
    hl_lid?: number;
    hl_attr?: string;
    controls?: string[];
    linkMainMap?: "true";
}

export const displayURLParams = new UrlParams<DisplayURLParams>({
    lon: { parse: parseFloat },
    lat: { parse: parseFloat },
    base: {},
    zoom: { parse: parseInt },
    angle: { parse: parseInt },
    annot: {},
    events: {},
    panel: {},
    panels: { parse: (val) => val.split(",") },
    styles: { parse: (val) => val.split(",").map((i) => parseInt(i, 10)) },
    hl_val: {},
    hl_lid: {},
    hl_attr: {},
    controls: { parse: (val) => val.split(",") },
    linkMainMap: {},
});

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
