import type Feature from "ol/Feature";
import type OlControl from "ol/control/Control";
import type { Options } from "ol/control/Control";

import type { CustomItemFileWriteStore } from "../compat/CustomItemFileWriteStore";
import type ShadowDisplay from "../compat/ShadowDisplay";
import type { ToggleControl } from "../map-toolbar/ToggleControl";
import type { Map } from "../ol/Map";
import type { PluginBase } from "../plugin/PluginBase";
import type { VisibleMode } from "../store/annotations/AnnotationsStore";
import type { WebMapTab } from "../webmap-tabs/WebMapTabsStore";

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

export interface TinyConfig {
    mainDisplayUrl: string;
}

export type MapPlugin = new (val: PluginParams) => PluginBase;

/** @deprecated use {@link ShadowDisplay} instead */
export type DojoDisplay = ShadowDisplay;

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

export interface Plugin {
    postCreate: () => void;
    startup: () => void;
}

export interface ControlOption extends Options {
    display: DojoDisplay;
    tipLabel: string;
}
