import type { ActionToolbarProps } from "@nextgisweb/gui/action-toolbar";
import type { RouteBody } from "@nextgisweb/pyramid/api/type";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { EditorStore } from "../type/EditorStore";

import type { FeatureEditorStore } from "./FeatureEditorStore";

export interface AttributesFormProps {
    store: FeatureEditorStore;
}

export type FeatureEditorMode = "save" | "return";

export interface FeatureEditorWidgetProps {
    resourceId?: number;
    featureId?: number;
    okBtnMsg?: string;
    toolbar?: Partial<ActionToolbarProps>;
    onSave?: (value: CompositeRead | undefined) => void;
    onOk?: (
        value: RouteBody<"feature_layer.feature.item", "put"> | undefined
    ) => void;
    store?: FeatureEditorStore;
    /** Action executed on onOk button press */
    mode?: FeatureEditorMode;
}

export interface FeatureEditorStoreOptions {
    resourceId: number;
    featureId: number | null;
    mode?: FeatureEditorMode;
}

export type EditorWidgetProps<
    S extends EditorStore = EditorStore,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    M = any,
> = {
    store?: S;
} & M;
