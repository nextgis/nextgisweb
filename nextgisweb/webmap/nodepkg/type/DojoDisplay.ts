/// <reference types="dojo/dijit" />

import type Feature from "ol/Feature";

import type WebmapStore from "../store";

import type { DisplayConfig } from "./DisplayConfig";
import type { DisplayMap } from "./DisplayMap";
import type { WebmapItem } from "./WebmapItem";
import type { WebmapLayer } from "./WebmapLayer";
import type { WebmapPlugin } from "./WebmapPlugin";

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

export type StoreItem = dojo.data.api.Item;

export interface CustomItemFileWriteStore extends dojo.data.ItemFileWriteStore {
    dumpItem: (item: StoreItem) => WebmapItem;
}

export interface FeatureHighlighter {
    highlightFeature: (data: HighlightFeatureData) => void;
    getHighlighted: () => Feature[];
    unhighlightFeature: (filter: (feature: Feature) => boolean) => void;
}

export interface DojoDisplay extends dijit._WidgetBase {
    identify: DojoDisplayIdentify;
    featureHighlighter: FeatureHighlighter;
    map: DisplayMap;
    mapContainer: dijit.layout.BorderContainer;
    displayProjection: string;
    config: DisplayConfig;
    itemStore: CustomItemFileWriteStore;
    webmapStore: WebmapStore;
    _plugins: WebmapPlugin[];
    /**
     * @deprecated use webmapStore.getlayers() instead
     */
    _layers: Record<number, WebmapLayer>;
}
