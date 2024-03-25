interface BaseItem {
    id: number;
    key: number;
    type: "layer" | "group" | "root";
    label: string;
    title: string;
}
export interface RootItem extends BaseItem {
    type: "root";
    children: TreeItem[];
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
    index: number;
    render: boolean;
    display_name: string;
    icon: Icon;
}

interface LegendInfo {
    visible: string;
    has_legend: boolean;
    symbols: SymbolInfo[];
    single: boolean;

    open?: boolean;
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
    editable?: boolean;
}

export type TreeItem = GroupItem | LayerItem | RootItem;
