import type { Collection, Feature as OlFeature, Map as OlMap } from "ol";
import type { Geometry } from "ol/geom";
import type { Interaction } from "ol/interaction";
import type VectorLayer from "ol/layer/Vector";
import type VectorSource from "ol/source/Vector";
import type { Style } from "ol/style";
import type { Options as StyleOptions } from "ol/style/Style";
import { createContext, useContext } from "react";

import type { UndoAction } from "../type";
import type { LayerColor } from "../util/styleUtil";

export type EditorContextValue = {
    id?: string | number;
    olMap: OlMap;
    layer: VectorLayer<VectorSource>;
    dirty: boolean;
    source: VectorSource;
    features: Collection<OlFeature<Geometry>>;
    layerColor: LayerColor;
    layerStyle: Style;
    selectStyle: Style;
    interactionsRef: React.RefObject<Map<string, Interaction>>;
    selectStyleOptions: StyleOptions;
    interactionsVersion: number;
    addUndo: (fn: UndoAction) => void;
};

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditorContext(): EditorContextValue {
    const context = useContext(EditorContext);
    if (context === null) {
        throw new Error(
            "No context provided: useEditorContext() can only be used in a descendant of <EditableItem>"
        );
    }
    return context;
}
