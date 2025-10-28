import { observer } from "mobx-react-lite";
import { Collection } from "ol";
import type { Feature as OlFeature } from "ol";
import type { Geometry } from "ol/geom";
import type { Interaction } from "ol/interaction";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import type { StyleFunction } from "ol/style/Style";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";

import { useUnsavedChanges } from "@nextgisweb/gui/hook";
import { useDebounce } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import { ToggleGroup } from "@nextgisweb/webmap/map-component/control/toggle-group";

import { EditorContext } from "./context/useEditorContext";
import { generateStyleForId } from "./util/styleUtil";

import UndoIcon from "@nextgisweb/icon/material/undo";

type UndoAction = () => void;
export interface EditableItemProps {
    id?: string | number;
    source?: VectorSource;

    enabled?: boolean;
    children?: React.ReactNode;

    editingMode?: string | null;

    onDirtyChange?: (val: boolean) => void;
    onEditingMode?: (val: string | null) => void;
}

function once<T extends (...args: any[]) => any>(fn: T): T {
    let called = false;
    return ((...args: Parameters<T>) => {
        if (called) return;
        called = true;
        return fn(...args);
    }) as T;
}

export const EditableItem = observer(
    ({
        id,
        source: outerSource,
        enabled,
        children,
        editingMode,
        onEditingMode,
        onDirtyChange,
    }: EditableItemProps) => {
        const { mapStore } = useMapContext();
        const { olMap } = mapStore;

        const interactionsRef = useRef<Map<string, Interaction>>(new Map());
        const [interactionsVersion, setInteractionsVersion] = useState(0);

        const [undo, setUndo] = useState<UndoAction[]>([]);
        const addUndo = (fn: UndoAction) =>
            setUndo((prev) => [...prev, once(fn)]);
        const dirty = undo.length > 0;

        const [style] = useState(() => generateStyleForId({ id: id ?? 0 }));

        useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

        const { layer, source, features } = useMemo(() => {
            const source = outerSource ?? new VectorSource();
            const features = new Collection<OlFeature<Geometry>>();
            const { layerStyle } = generateStyleForId({ id: id ?? 0 });

            const filteredStyle: StyleFunction = (feature) => {
                if (id === undefined || feature.get("layer_id") === id) {
                    if (!feature.get("deleted")) return layerStyle;
                }
                return undefined;
            };

            const layer = new VectorLayer({
                style: filteredStyle,
                zIndex: 9999,
            });
            layer.setSource(source);

            source.forEachFeature((f) => {
                if (id === undefined || f.get("layer_id") === id) {
                    features.push(f);
                }
            });

            return { layer, source, features };
        }, [outerSource, id]);

        useEffect(() => {
            const interactions = interactionsRef.current;
            setInteractionsVersion((old) => old + 1);
            olMap.addLayer(layer);
            return () => {
                interactions.forEach((interaction) => {
                    interaction.dispose();
                });
                interactions.clear();
                olMap.removeLayer(layer);
            };
        }, [olMap, layer]);

        const setLayerOpacity = useCallback(
            (opacity: number) => {
                layer.setOpacity(opacity);
            },
            [layer]
        );

        const setLayerOpacityDebounced = useDebounce(setLayerOpacity, 50);

        useEffect(() => {
            setLayerOpacityDebounced(enabled && editingMode ? 1 : 0.4);
        }, [editingMode, enabled, setLayerOpacityDebounced]);

        const onUndoClick = useCallback(() => {
            setUndo((prev) => {
                const next = [...prev];
                const toUndo = next.pop();
                // The undo action modifies the map source, which can trigger re-renders
                // in parent components and lead to rendering conflicts.
                setTimeout(() => {
                    toUndo?.();
                });

                return next;
            });
        }, []);

        useUnsavedChanges({ dirty });

        return (
            <EditorContext
                value={{
                    id,
                    olMap,
                    layer,
                    dirty,
                    source,

                    features,

                    layerColor: style.color,
                    layerStyle: style.layerStyle,
                    selectStyle: style.selectStyle,
                    interactionsRef,
                    selectStyleOptions: style.selectStyleOptions,
                    interactionsVersion,
                    addUndo,
                }}
            >
                {enabled && (
                    <>
                        <ToggleGroup
                            value={editingMode}
                            onChange={onEditingMode}
                            nonEmpty
                        >
                            {children}
                        </ToggleGroup>

                        <ButtonControl
                            disabled={!dirty}
                            order={200}
                            title={gettext("Undo the last change")}
                            onClick={onUndoClick}
                        >
                            <UndoIcon />
                        </ButtonControl>
                    </>
                )}
            </EditorContext>
        );
    }
);

EditableItem.displayName = "EditableItem";
