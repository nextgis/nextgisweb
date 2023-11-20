/// <reference types="dojo/dijit" />

import type Feature from "ol/Feature";
import type Map from "ol/Map";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/FeatureExtent";

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

export interface HighlightFeatureData {
    geom: string;
    featureId: number;
    layerId: number;
}

export interface FeatureHighlighter {
    highlightFeature: (data: HighlightFeatureData) => void;
    getHighlighted: () => Feature[];
    unhighlightFeature: (filter: (feature: Feature) => boolean) => void;
}

export interface DojoItem extends HTMLElement {
    set: (key: string, value: unknown) => void;
    domNode: HTMLElement;
    on?: (eventName: string, callback: (panel: PanelDojoItem) => void) => void;
    addChild: (child: DojoItem) => void;
    get: (val: string) => unknown;
}

export interface DojoMap {
    zoomToFeature: (feature: Feature) => void;
    zoomToNgwExtent: (ngwExtent: NgwExtent, projection?: string) => void;
    olMap: Map;
}

export interface DojoDisplay extends dijit._WidgetBase {
    identify: DojoDisplayIdentify;
    featureHighlighter: FeatureHighlighter;
    map: DojoMap;
    mapContainer: dijit.layout.BorderContainer;
    displayProjection: string;
    _layers: Record<number, BaseLayer>;
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
