import type { Collection, Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { Interaction } from "ol/interaction";

import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

export interface FeatureInfo {
    id: number;
    geom: string;
}

export interface EditingItem {
    id: number;
    nodeData: LayerItemConfig;
    interactions: Record<string, Interaction>;
    features: Collection<Feature<Geometry>>;
    featuresDeleted: Feature<Geometry>[];
}

export interface FeatureToSave {
    id?: number;
    geom: string;
}

export interface FeaturesToSave {
    patch: FeatureToSave[];
    delete: FeatureToSave[];
}
