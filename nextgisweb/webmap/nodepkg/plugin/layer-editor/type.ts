import type { Collection, Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { Interaction } from "ol/interaction";
import type { FunctionComponent } from "react";

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

// TODO: Extract from Feature item API
interface FeatureAttributes {
  [key: string]: unknown;
}

export interface FeatureCreate extends FeatureAttributes {
  geom: string;
}

export interface FeatureUpdate extends FeatureAttributes {
  id: number;
  geom: string;
}

interface FeatureDelete {
  id: number;
  delete: true;
}

export type FeatureToSave = FeatureCreate | FeatureUpdate | FeatureDelete;

export type UndoAction = () => void;

export interface LayerEditorProps {
  order?: number;
  disabled?: boolean;
}

export type LayerEditorMode<P = Record<string, any>> = FunctionComponent<
  LayerEditorProps & P
> & { displayName: string };
