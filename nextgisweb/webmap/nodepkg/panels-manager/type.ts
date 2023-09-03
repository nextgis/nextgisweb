import type Feature from "ol/Feature";
import { NgwExtent } from "@nextgisweb/feature-layer/type/FeatureExtent";

export interface TopicSubscription {
    remove: () => void;
}
export interface DojoTopic {
    subscribe: (
        type: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listener: (...args: any[]) => void
    ) => TopicSubscription;
}
export interface DojoItem extends HTMLElement {
    set: (key: string, value: unknown) => void;
    domNode: HTMLElement;
    on?: (eventName: string, callback: (panel: PanelDojoItem) => void) => void;
    addChild: (child: DojoItem) => void;
    get: (val: string) => unknown;
}

interface DojoMap {
    zoomToFeature: (feature: Feature) => void;
    zoomToNgwExtent: (ngwExtent: NgwExtent, projection?: string) => void;
}

interface BaseLayer {
    reload: () => void;
}

interface DojoDisplayIdentifyPopup {
    widget?: DojoDisplayIdentify;
}
interface DojoDisplayIdentify {
    _popup: DojoDisplayIdentifyPopup;
    reset: () => void;
}

interface HighlightFeatureData {
    geom: string;
    featureId: number;
    layerId: number;
}
interface FeatureHighlighter {
    highlightFeature: (data: HighlightFeatureData) => void;
    getHighlighted: () => Feature[];
    unhighlightFeature: (filter: (feature: Feature) => boolean) => void;
}

export interface DojoDisplay extends DojoItem {
    identify: DojoDisplayIdentify;
    featureHighlighter: FeatureHighlighter;
    map: DojoMap;
    displayProjection: string;
    _layers: Record<number, BaseLayer>;
}

export interface FeatureLayerWebMapPluginConfig {
    likeSearch: boolean;
    readonly: boolean;
}

export interface DisplayItemConfig {
    plugin: Record<string, unknown>;
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

export type DojoPanel = PanelDojoItem;
