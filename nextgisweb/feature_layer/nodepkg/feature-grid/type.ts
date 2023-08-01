import { FeatureItem } from "../type";

export interface FeatureData extends FeatureItem {
    __rowIndex?: number;
}

export type Selected = FeatureData;
