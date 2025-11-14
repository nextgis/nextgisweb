export interface BaseItemConfig {
    id: number;
    type: StoreItemConfig["type"];
    label: string;
}

// `-1` - hide layer at all, `null` - use default render without symbols
export type LayerSymbols = string[] | "-1" | null;

export interface StoreLayerConfig extends BaseItemConfig {
    type: "layer";
    layerId: number;
    styleId: number;
    checked: boolean;
    visibility: boolean | null;
    identifiable: boolean;
    symbols: LayerSymbols;
}

export interface StoreGroupConfig extends BaseItemConfig {
    type: "group";
    children: (StoreLayerConfig | StoreGroupConfig)[];
}

export interface StoreRootConfig extends BaseItemConfig {
    type: "root";
    children: (StoreLayerConfig | StoreGroupConfig)[];
}

export type StoreItemConfig =
    | StoreRootConfig
    | StoreGroupConfig
    | StoreLayerConfig;
