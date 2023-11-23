interface BaseItem {
    id: number;
    key: number;
    type: "layer" | "group";
    label: string;
    title: string;
}

export interface GroupItem extends BaseItem {
    type: "group";
    expanded: boolean;
    children: TreeItem[];
}

interface Icon {
    format: string;
    data: string;
}
interface SymbolInfo {
    display_name: string;
    icon: Icon;
}

interface LegendInfo {
    visible: string;
    has_legend: boolean;
    symbols: SymbolInfo[];
    single: boolean;
}

export interface LayerItem extends BaseItem {
    type: "layer";
    layerId: number;
    styleId: number;
    visibility: boolean;
    identifiable: boolean;
    transparency: unknown;
    minScaleDenom: unknown;
    maxScaleDenom: unknown;
    drawOrderPosition: unknown;
    legendInfo: LegendInfo;
    adapter: string;
    plugin: Record<string, unknown>;
    minResolution: unknown;
    maxResolution: unknown;
}

export type TreeItem = GroupItem | LayerItem;
