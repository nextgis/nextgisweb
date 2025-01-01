import type { Collection, Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { Interaction } from "ol/interaction";

import type { LayerItem } from "@nextgisweb/webmap/type/TreeItems";

export interface FeatureInfo {
    id: number;
    geom: string;
}

export interface EditingItem {
    id: number;
    nodeData: LayerItem;
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
