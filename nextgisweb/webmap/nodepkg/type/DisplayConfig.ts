import type { BasemapLayerRead } from "@nextgisweb/basemap/type/api";

import type { VisibleMode } from "../store/annotations/AnnotationsStore";

import type { GroupItem } from "./TreeItems";

interface Scope {
    read: boolean;
    write: boolean;
    manage: boolean;
}

interface Annotations {
    enabled: boolean;
    default: VisibleMode;
    scope: Scope;
}

interface BasemapConfig extends BasemapLayerRead {
    keyname: string;
    display_name: string;

    opacity?: number;
    enabled?: boolean;
}

export interface WebmapPluginConfig {
    [name: string]: Record<string, any>;
    basemaps: BasemapConfig[];
}

export type Entrypoint =
    | string
    | [midKey: string, loader: () => Promise<{ default: any }>];
interface Mid {
    adapter: Entrypoint[];
    basemap: Entrypoint[];
    plugin: Entrypoint[];
}

interface ItemsStates {
    expanded: any[];
    checked: number[];
}

export interface DisplayConfig {
    extent: number[];
    extent_const: null[];
    rootItem: GroupItem;
    itemsStates: ItemsStates;
    mid: Mid;
    webmapPlugin: WebmapPluginConfig;
    bookmarkLayerId?: any;
    webmapId: number;
    webmapDescription: string;
    webmapTitle: string;
    webmapEditable: boolean;
    webmapLegendVisible: string;
    drawOrderEnabled?: any;
    annotations: Annotations;
    units: string;
    printMaxSize: number;
    measureSrsId?: number;
}
