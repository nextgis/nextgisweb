import type { ActionToolbarProps } from "@nextgisweb/gui/action-toolbar";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { EditorStore } from "../type/EditorStore";

import type { FeatureEditorStore } from "./FeatureEditorStore";

export interface AttributesFormProps {
    store: FeatureEditorStore;
}

export interface FeatureEditorWidgetProps {
    resourceId?: number;
    featureId?: number;
    toolbar?: Partial<ActionToolbarProps>;
    onSave?: (value: CompositeRead | undefined) => void;
    store?: FeatureEditorStore;
}

export interface FeatureEditorStoreOptions {
    resourceId: number;
    featureId: number;
}

export type EditorWidgetProps<
    S extends EditorStore = EditorStore,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    M = any,
> = {
    store?: S;
} & M;
