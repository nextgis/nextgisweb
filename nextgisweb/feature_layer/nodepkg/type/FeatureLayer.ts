import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

export type FeatureLayerDataType = FeatureLayerFieldRead["datatype"];

export interface FeatureLayerCount {
    total_count: number;
}
