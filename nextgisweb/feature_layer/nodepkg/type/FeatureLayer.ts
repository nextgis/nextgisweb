export type FeatureLayerDataType =
    | "STRING"
    | "REAL"
    | "INTEGER"
    | "BIGINT"
    | "DATETIME"
    | "DATE"
    | "TIME";

export interface FeatureLayerField {
    id: number;
    keyname: string;
    datatype: FeatureLayerDataType;
    typemod?: unknown;
    display_name: string;
    label_field: boolean;
    grid_visibility: boolean;
    lookup_table?: unknown;
}

export interface FeatureLayer {
    fields: FeatureLayerField[];
}
