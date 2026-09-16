import type { Geometry } from "ol/geom";

import type { ActionToolbarProps } from "@nextgisweb/gui/action-toolbar";
import type { RouteBody } from "@nextgisweb/pyramid/api/type";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { FeatureItem } from "../type";
import type { EditorStore } from "../type/EditorStore";

import type { FeatureEditorStore } from "./FeatureEditorStore";

export interface AttributesFormProps {
  store: FeatureEditorStore;
}

export type FeatureEditorMode = "save" | "return";

export interface FeatureEditorWidgetProps {
  showGeometryTab?: boolean;
  featureItem?: FeatureItem;
  resourceId?: number;
  /** Allow pressing OK without making changes */
  allowEmpty?: boolean;
  featureId?: number;
  okBtnMsg?: string;
  /** Current geometry, overriding featureItem.geom. */
  geometry?: Geometry | null;
  toolbar?: Partial<ActionToolbarProps>;
  onSave?: (value: CompositeRead | undefined) => void;
  onOk?: (
    value: RouteBody<"feature_layer.feature.item", "put"> | undefined,
    item: FeatureItem | undefined
  ) => void;
  store?: FeatureEditorStore;
  /** Action executed on onOk button press */
  mode?: FeatureEditorMode;
}

export interface FeatureEditorStoreOptions {
  featureItem?: FeatureItem;
  geometry?: Geometry | null;
  resourceId: number;
  featureId: number | null;
  mode?: FeatureEditorMode;
}

export type EditorWidgetProps<S extends EditorStore = EditorStore, M = any> = {
  store?: S;
} & M;
