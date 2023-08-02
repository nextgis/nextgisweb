import type { NgwAttributeType } from "../type";
import type { FeatureLayerField } from "../type/FeatureLayer";

export type FeatureAttrs = Record<string, NgwAttributeType> & {
    __rowIndex?: number;
};

export type Selected = FeatureAttrs;

export type ColOrder = "asc" | "desc" | null;

export type OrderBy = [keynme: string, ordering: ColOrder];

export interface FeatureLayerFieldCol extends FeatureLayerField {
    flex?: string;
}
