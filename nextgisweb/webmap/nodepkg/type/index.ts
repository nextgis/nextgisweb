import type { LayerDisplayAdapterCtor } from "../DisplayLayerAdapter";
import type { LayerSymbols } from "../compat/type";
import type { Display } from "../display";
import type { MapStore } from "../ol/MapStore";
import type { PluginBase } from "../plugin/PluginBase";
import type { AnnotationVisibleMode } from "../store/annotations/AnnotationsStore";
import type { TreeLayerStore } from "../store/tree-store/TreeItemStore";
import type { TreeStore } from "../store/tree-store/TreeStore";

export * from "./DisplayConfig";

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
    treeStore: TreeStore | boolean;
}

export interface PluginState {
    enabled: boolean;
    nodeData: TreeLayerStore;
    map: MapStore;
    active?: boolean;
}
