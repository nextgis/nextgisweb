interface BaseItem {
    id: number;
    type: string;
    label: string;
    position: number | null;
}

// `-1` - hide layer at all, `null` - use default render without symbols
export type LayerSymbols = string[] | "-1" | null;

export interface StoreLayerConfig extends BaseItem {
    type: "layer";
    layerId: number;
    styleId: number;
    checked: boolean;
    visibility: boolean | null;
    identifiable: boolean;
    symbols: LayerSymbols;
}

export interface StoreGroupConfig extends BaseItem {
    type: "group";
    children: (StoreLayerConfig | StoreGroupConfig)[];
}

export interface StoreRootConfig extends BaseItem {
    type: "root";
    children: (StoreLayerConfig | StoreGroupConfig)[];
}

export type StoreItemConfig =
    | StoreRootConfig
    | StoreGroupConfig
    | StoreLayerConfig;
