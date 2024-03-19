import type { GroupItem } from "./TreeItems";

interface Scope {
    read: boolean;
    write: boolean;
    manage: boolean;
}

interface Annotations {
    enabled: boolean;
    default: string;
    scope: Scope;
}

interface WebmapPlugin {
    [name: string]: Record<string, unknown>;
}

interface Mid {
    adapter: string[];
    basemap: string[];
    plugin: string[];
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
    webmapPlugin: WebmapPlugin;
    bookmarkLayerId?: any;
    webmapId: number;
    webmapDescription: string;
    webmapTitle: string;
    webmapEditable: boolean;
    webmapLegendVisible: string;
    drawOrderEnabled?: any;
    annotations: Annotations;
    units: string;
}
