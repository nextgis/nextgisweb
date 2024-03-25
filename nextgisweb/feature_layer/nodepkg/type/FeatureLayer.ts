export type FeatureLayerDataType =
    | "STRING"
    | "REAL"
    | "INTEGER"
    | "BIGINT"
    | "DATETIME"
    | "DATE"
    | "TIME";

export interface LookupTable {
    id: number;
}
export interface FeatureLayerField {
    id: number;
    keyname: string;
    datatype: FeatureLayerDataType;
    typemod?: unknown;
    display_name: string;
    label_field?: boolean;
    grid_visibility?: boolean;
    text_search?: boolean;
    lookup_table?: LookupTable;
}

export interface FeatureLayer {
    fields: FeatureLayerField[];
}

export interface FeatureLayerCount {
    total_count: number;
}
