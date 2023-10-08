import type { ActionToolbarProps } from "@nextgisweb/gui/action-toolbar";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import type { EditorStore } from "../type/EditorStore";

import type { FeatureEditorStore } from "./FeatureEditorStore";

export interface AttributesFormProps {
    store: FeatureEditorStore;
}

export interface FeatureEditorWidgetProps {
    resourceId?: number;
    featureId?: number;
    toolbar?: Partial<ActionToolbarProps>;
    onSave?: (value: ResourceItem | undefined) => void;
    store?: FeatureEditorStore;
}

export interface FeatureEditorStoreOptions {
    resourceId: number;
    featureId: number;
}

export interface EditorWidgetProps<
    V = unknown,
    S extends EditorStore<V> = EditorStore<V>,
> {
    store?: S;
}
