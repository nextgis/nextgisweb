export type LayerType = "layer" | "group" | "root";

interface BaseItem {
    id: number;
    key: number;
    type: LayerType;
    label: string;
    title: string;
}
export interface RootItemConfig extends BaseItem {
    type: "root";
    children: TreeChildrenItemConfig[];
}

export interface GroupItemConfig extends BaseItem {
    type: "group";
    expanded: boolean;
    exclusive: boolean;
    children: TreeChildrenItemConfig[];
}

interface Icon {
    format: string;
    data: string;
}
export interface SymbolInfo {
    index: number;
    render: boolean;
    display_name: string; // possible null?
    icon: Icon;
}

interface LegendInfo {
    visible: "collapse" | "expand";
    has_legend: boolean;
    symbols: SymbolInfo[];
    single: boolean;
    open?: boolean;
}

/**
 * Сonfiguration for WebMap layer plugins.
 * You can extend this interface by declaring additional plugin configurations in your modules.
 *
 * @example
 * declare module "@nextgisweb/webmap/type/TreeItems" {
 *     interface PluginConfig {
 *         "@nextgisweb/webmap/plugin/feature-layer": FeatureLayerWebMapPluginConfig;
 *     }
 * }
 */
export interface PluginConfig {
    [K: string]: any;
}

export type LayerPluginConfig = {
    [K in keyof PluginConfig]?: PluginConfig[K] | undefined;
};

export interface LayerItemConfig extends BaseItem {
    type: "layer";
    layerId: number;
    styleId: number;
    visibility: boolean;
    identifiable: boolean;
    transparency: number | null;
    minScaleDenom: number | null;
    maxScaleDenom: number | null;
    drawOrderPosition: number | null;
    legendInfo: LegendInfo;
    adapter: string;
    plugin: LayerPluginConfig;
    minResolution: number | null;
    maxResolution: number | null;
    editable?: boolean;
}

export type TreeItemConfig = RootItemConfig | GroupItemConfig | LayerItemConfig;
export type TreeChildrenItemConfig = GroupItemConfig | LayerItemConfig;
