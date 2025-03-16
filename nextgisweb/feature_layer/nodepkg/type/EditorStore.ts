import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import type { FeatureEditorStore } from "../feature-editor/FeatureEditorStore";

export interface EditorStoreConstructorOptions {
    parentStore?: FeatureEditorStore;
    fields?: FeatureLayerFieldRead[];
}

export interface EditorStore<V = any> {
    value: V;

    /** True if value has been changed
     * @default false
     */
    dirty: boolean;

    /**
     * Reset to initial values
     */
    reset?: () => void;

    /**
     * A quick report the number of records in storage value to extract for external component such as a tab
     */
    counter?: number | null;

    load: (value: V) => void;

    isValid?: boolean;
}
