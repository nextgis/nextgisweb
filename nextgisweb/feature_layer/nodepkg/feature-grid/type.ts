import type { FeatureItem } from "../type/FeatureItem";
import type { FeatureLayerField } from "../type/FeatureLayer";

export interface FeatureData extends FeatureItem {
    __rowIndex?: number;
}

export type Selected = FeatureData;

export type ColOrder = "asc" | "desc" | null;

export type OrderBy = [keynme: string, ordering: ColOrder];

export interface FeatureLayerFieldCol extends FeatureLayerField {
    flex?: string;
}
