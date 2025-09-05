import { observer } from "mobx-react-lite";
import { Collection } from "ol";
import type { Feature as OlFeature } from "ol";
import type { FeatureLike } from "ol/Feature";
import {
    click,
    never,
    pointerMove,
    shiftKeyOnly,
    singleClick,
} from "ol/events/condition";
import type { Geometry } from "ol/geom";
import { Draw, Modify, Select, Snap, Translate } from "ol/interaction";
import type { Interaction } from "ol/interaction";
import type { ModifyEvent } from "ol/interaction/Modify";
import type {
    SelectEvent,
    Options as SelectOptions,
} from "ol/interaction/Select";
import VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source";
import Style from "ol/style/Style";
import type { StyleFunction } from "ol/style/Style";
import { useEffect, useRef, useState, useTransition } from "react";

import { errorModal } from "@nextgisweb/gui/error";
import { useShowModal } from "@nextgisweb/gui/index";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";

import { EDITING_STATES } from "./constant";
import type { EditingState, InteractionKey } from "./constant";
import { fetchResourceOlFeature, getGeomConfig } from "./editor-api";
import type { GeomConfig } from "./editor-api";
import { getResourceStyle } from "./util/styleUtil";

export interface EditableItemProps {
    editingMode: EditingState | null;
    resourceId: number;
    source?: VectorSource;
    snap?: boolean;
    onUndoActionAdd?: (cb: () => void) => void;
    onLoadingChange?: (isLoading: boolean) => void;
}

type AllInteractionKey = InteractionKey | "select" | "hoverSelect";

export const EditableItem = observer(
    ({
        editingMode,
        resourceId,
        source: outerSource,
        snap: canSnap,
        onUndoActionAdd,
        onLoadingChange,
    }: EditableItemProps) => {
        const { display } = useDisplayContext();
        const { map } = display;
        const { olMap } = map;
        const { lazyModal, modalStore, modalHolder } = useShowModal();
        const { makeSignal } = useAbortController();

        const [isLoading, startTransition] = useTransition();

        const [geomConfig, setGeometryConfig] = useState<GeomConfig | null>(
            null
        );

        const editorVectorLayerRef = useRef<VectorLayer>(null);

        const [interactions, setInteractions] = useState<Map<
            AllInteractionKey,
            Interaction
        > | null>(null);

        const onLoadingRef = useRef(onLoadingChange);
        useEffect(() => {
            onLoadingRef.current = onLoadingChange;
        }, [onLoadingChange]);
        useEffect(() => {
            onLoadingRef.current?.(isLoading);
        }, [isLoading]);

        const onUndoActionAddRef = useRef(onUndoActionAdd);
        useEffect(() => {
            onUndoActionAddRef.current = onUndoActionAdd;
        }, [onUndoActionAdd]);

        useEffect(() => {
            startTransition(async () => {
                setGeometryConfig(null);
                try {
                    const config = await getGeomConfig({
                        resourceId,
                        signal: makeSignal(),
                    });
                    setGeometryConfig(config);
                } catch (er) {
                    errorModal(er, { modalStore });
                }
            });
        }, [makeSignal, modalStore, resourceId]);

        useEffect(() => {
            if (!geomConfig) return;
            let isDragging = false;
            const { layerStyle, selectStyle, selectStyleOptions } =
                getResourceStyle({
                    resourceId,
                });

            const features = new Collection<OlFeature<Geometry>>();
            const source = outerSource || new VectorSource();

            const filteresStyle: StyleFunction = (feature) => {
                if (feature.get("layer_id") !== resourceId) {
                    return;
                }
                const isDeleted = feature.get("deleted");

                if (isDeleted) {
                    return;
                }
                return layerStyle;
            };

            const editorVectorLayer = new VectorLayer({
                style: filteresStyle,
            });
            editorVectorLayer.setSource(source);
            map.olMap.addLayer(editorVectorLayer);
            editorVectorLayerRef.current = editorVectorLayer;

            const selectOptions: SelectOptions = {
                layers: [editorVectorLayer],
                multi: false,
                style: selectStyle,
                filter: (f: FeatureLike) => f.get("layer_id") === resourceId,
            };
            const select = new Select({
                condition: click,
                ...selectOptions,
            });

            olMap.addInteraction(select);

            const hoverSelect = new Select({
                condition: pointerMove,
                ...selectOptions,
            });

            // FIXME: For unnown reason the `select` event executet two times in row
            const onSelect = (ev: SelectEvent) => {
                const feature = ev.selected[0];

                if (feature) {
                    feature.set("deleted", true);
                    // source.removeFeature(feature);

                    onUndoActionAddRef.current?.(() => {
                        feature.set("deleted", false);
                        if (!source.hasFeature(feature)) {
                            // source.addFeature(feature);
                        }
                        select.getFeatures().clear();
                        hoverSelect.getFeatures().clear();
                    });
                    select.getFeatures().clear();
                    hoverSelect.getFeatures().clear();
                }
            };

            select.on("select", onSelect);

            hoverSelect.on("select", (e) => {
                if (isDragging) return;
                e.selected.forEach((f) => {
                    f.setStyle(
                        new Style({ ...selectStyleOptions, zIndex: 9999 })
                    );
                });
                e.deselected.forEach((f) => {
                    f.setStyle(undefined);
                });
            });

            olMap.addInteraction(hoverSelect);

            const draw = new Draw({
                type: geomConfig.type,
                style: selectStyle,
                source,
                features,
                geometryLayout: geomConfig.layout,
                freehandCondition: never,
            });

            draw.on("drawend", (e) => {
                e.feature.set("layer_id", resourceId);
                lazyModal(
                    () =>
                        import(
                            "@nextgisweb/feature-layer/feature-editor-modal"
                        ),
                    {
                        skipDirtyCheck: true,
                        editorOptions: {
                            mode: "return",
                            showGeometryTab: false,
                            resourceId,
                            onOk: (value) => {
                                e.feature.set("attribution", value);
                                onUndoActionAddRef.current?.(() => {
                                    source.removeFeature(e.feature);
                                });
                            },
                        },
                        onCancel: () => {
                            onUndoActionAddRef.current?.(() => {
                                source.removeFeature(e.feature);
                            });
                        },
                    }
                );
            });

            const modify = new Modify({
                features,
                style: selectStyle,
                deleteCondition: (evt) => shiftKeyOnly(evt) && singleClick(evt),
            });

            const move = new Translate({
                features: hoverSelect.getFeatures(),
                layers: [editorVectorLayer],
            });

            const preModify = new WeakMap<OlFeature<Geometry>, Geometry>();

            const onModifyStart = (e: ModifyEvent) => {
                const feats = (e.features ?? features) as Collection<
                    OlFeature<Geometry>
                >;
                feats.forEach((f) => {
                    const g = f.getGeometry();
                    if (g) {
                        preModify.set(f, g.clone());
                    }
                });
            };
            const onModifyEnd = (e: ModifyEvent) => {
                const feats = (e.features ?? features) as Collection<
                    OlFeature<Geometry>
                >;
                feats.forEach((f) => {
                    const before = preModify.get(f);
                    if (!before) return;

                    onUndoActionAddRef.current?.(() => {
                        f.setGeometry(before.clone());
                    });

                    preModify.delete(f);
                });
            };

            modify.on("modifystart", onModifyStart);
            modify.on("modifyend", onModifyEnd);

            move.on("translatestart", (e) => {
                isDragging = true;
                hoverSelect.setActive(false);
                onModifyStart(e);
            });
            move.on("translateend", (e) => {
                isDragging = false;
                hoverSelect.setActive(true);
                onModifyEnd(e);
            });

            const snap = new Snap({ source });

            const interactions = new Map<AllInteractionKey, Interaction>([
                ["draw", draw],
                ["modify", modify],
                ["move", move],
                ["select", select],
                ["hoverSelect", hoverSelect],
                ["snap", snap], // snap should be on the last position
            ]);
            setInteractions(interactions);

            for (const [, interaction] of interactions) {
                olMap.addInteraction(interaction);
                interaction.setActive(false);
            }

            startTransition(async () => {
                try {
                    const olFeatures = await fetchResourceOlFeature({
                        resourceId,
                        signal: makeSignal(),
                    });
                    features.extend(olFeatures);
                    source.addFeatures(olFeatures);
                } catch (err) {
                    errorModal(err, { modalStore });
                }
            });

            const clearSource = () => {
                if (outerSource) {
                    features.forEach((feature) => {
                        source.removeFeature(feature);
                    });
                } else {
                    source.clear();
                }
            };

            return () => {
                select.un("select", onSelect);

                setInteractions((prev) => {
                    if (prev) {
                        for (const [, interaction] of interactions) {
                            interaction.setActive(false);
                            olMap.removeInteraction(interaction);
                        }
                    }
                    return null;
                });
                clearSource();
                map.olMap.removeLayer(editorVectorLayer);
            };
        }, [
            map,
            olMap,
            modalStore,
            geomConfig,
            resourceId,
            outerSource,
            makeSignal,
            lazyModal,
        ]);

        useEffect(() => {
            if (!interactions) return;

            for (const [, interaction] of interactions) {
                interaction?.setActive(false);
            }

            if (editorVectorLayerRef.current) {
                editorVectorLayerRef.current.setOpacity(editingMode ? 1 : 0.4);
            }
            if (canSnap) {
                interactions.get("snap")?.setActive(true);
            }
            switch (editingMode) {
                case EDITING_STATES.CREATING:
                    interactions.get("draw")?.setActive(true);
                    break;
                case EDITING_STATES.MODIFYING:
                    interactions.get("modify")?.setActive(true);
                    break;
                case EDITING_STATES.MOVING:
                    interactions.get("hoverSelect")?.setActive(true);
                    interactions.get("move")?.setActive(true);
                    break;
                case EDITING_STATES.DELETING:
                    interactions.get("select")?.setActive(true);
                    interactions.get("hoverSelect")?.setActive(true);
                    break;
                default:
                    break;
            }
        }, [editingMode, interactions, canSnap, map]);

        return <>{modalHolder}</>;
    }
);

EditableItem.displayName = "EditableItem";
