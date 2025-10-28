import { debounce } from "lodash-es";
import type { Feature as OlFeature } from "ol";
import { unByKey } from "ol/Observable";
import type { Coordinate } from "ol/coordinate";
import { never } from "ol/events/condition";
import type { Point } from "ol/geom";
import type Geometry from "ol/geom/Geometry";
import type { GeometryLayout } from "ol/geom/Geometry";
import MultiPoint from "ol/geom/MultiPoint";
import Polygon from "ol/geom/Polygon";
import { Draw, Modify } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import type { DrawEvent } from "ol/interaction/Draw";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import { useCallback, useEffect, useMemo, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";
import type { LayerEditorMode } from "../type";

import AddIcon from "@nextgisweb/icon/material/rectangle";

export interface RectEditModeProps {
    geomLayout?: GeometryLayout;
    clearPrevious?: boolean;
    onDrawstart?: (ev: DrawEvent) => void;
    onDrawend?: (ev: DrawEvent) => Promise<void>;
}

type ModifyGeometry = {
    geometry: Polygon;
    geometry0: Polygon;
    cornerIndex: number;
    corners0: Coordinate[];
};

export const RectEditMode: LayerEditorMode<RectEditModeProps> = ({
    order,
    geomLayout,
    clearPrevious,
    onDrawstart,
    onDrawend,
}) => {
    const {
        id,
        layer,
        olMap,
        source,
        features,
        layerStyle,
        layerColor,
        addUndo,
    } = useEditorContext();
    const [active, setActive] = useState(false);

    const createDraw = useCallback(() => {
        const draw = new Draw({
            type: "Circle",
            geometryFunction: createBox(),
            geometryLayout: geomLayout,
            source,
            features,
            style: layerStyle,
        });

        let prevUndo: undefined | (() => void);

        draw.on("drawstart", (e: DrawEvent) => {
            if (clearPrevious) {
                const prev = source.getFeatures().slice();
                if (prev.length > 0) {
                    source.clear();
                    prevUndo = () => prev.forEach((f) => source.addFeature(f));
                }
            } else {
                prevUndo = undefined;
            }
            onDrawstart?.(e);
        });

        draw.on("drawend", async (e) => {
            if (id !== undefined) e.feature.set("layer_id", id);

            const prvev = prevUndo;
            const undo = () => {
                source.removeFeature(e.feature);
                prvev?.();
            };

            try {
                await onDrawend?.(e);
                addUndo(undo);
            } catch {
                undo();
            } finally {
                prevUndo = undefined;
            }
        });

        return draw;
    }, [
        id,
        source,
        features,
        layerStyle,
        geomLayout,
        clearPrevious,
        onDrawstart,
        onDrawend,
        addUndo,
    ]);

    const draw = useInteraction(
        RectEditMode.displayName + ":draw",
        active,
        createDraw
    );

    const liveSelectStyle = useMemo(() => {
        const s = layerStyle.clone();

        s.setGeometry((f) => {
            const mg = f.get("modifyGeometry");
            return mg ? mg.geometry : f.getGeometry();
        });

        return s;
    }, [layerStyle]);

    const overlayStyle = useMemo(
        () => (feature: OlFeature<Polygon>) => {
            const styles: Style[] = [liveSelectStyle];

            const modifyGeometry: ModifyGeometry | undefined =
                feature.get("modifyGeometry");
            const geometry: Polygon | undefined = modifyGeometry
                ? modifyGeometry.geometry
                : feature.getGeometry();

            if (geometry && geometry.getType() === "Polygon") {
                const ring = geometry.getCoordinates()[0];

                const corners = ring.slice(0, ring.length - 1);
                styles.push(
                    new Style({
                        geometry: new MultiPoint(corners),
                        image: new CircleStyle({
                            radius: 4,
                            fill: new Fill({ color: layerColor.baseColor }),
                        }),
                    })
                );
            }
            return styles;
        },
        [layerColor.baseColor, liveSelectStyle]
    );

    const createModify = useCallback(() => {
        const modify = new Modify({
            source,
            deleteCondition: never,
            insertVertexCondition: never,
            style: (feature) => {
                feature.get("features").forEach((mf: OlFeature) => {
                    const mg: ModifyGeometry | undefined =
                        mf.get("modifyGeometry");
                    if (!mg) return;

                    const handle = feature.getGeometry() as Point;
                    const p = handle?.getCoordinates();
                    if (!p) return;

                    const opposite = mg.corners0[(mg.cornerIndex + 2) % 4];
                    const minX = Math.min(opposite[0], p[0]);
                    const maxX = Math.max(opposite[0], p[0]);
                    const minY = Math.min(opposite[1], p[1]);
                    const maxY = Math.max(opposite[1], p[1]);

                    const newRing: Coordinate[] = [
                        [minX, minY],
                        [minX, maxY],
                        [maxX, maxY],
                        [maxX, minY],
                        [minX, minY],
                    ];

                    const layout = mg.geometry0.getLayout?.();
                    mg.geometry = new Polygon([newRing], layout);
                });

                return new Style({
                    image: new CircleStyle({
                        radius: 8,
                        fill: new Fill({ color: layerColor.baseColor }),
                    }),
                });
            },
        });

        const pre = new WeakMap<OlFeature<Geometry>, Geometry>();

        modify.on("modifystart", (e) => {
            e.features.forEach((f) => {
                const g0 = f.getGeometry() as Polygon | undefined;
                if (!g0) return;

                const ring0 = g0.getCoordinates()[0];
                if (!ring0 || ring0.length < 5) return;
                const corners0 = ring0.slice(0, ring0.length - 1);

                const startCoord = e.mapBrowserEvent.coordinate;

                let cornerIndex = 0;

                const map = e.mapBrowserEvent.map;
                const tolPx = 10;
                const tol2 = tolPx * tolPx;

                const [sx, sy] = map.getPixelFromCoordinate(startCoord);

                const idxTol = corners0.findIndex((c) => {
                    const [cx, cy] = map.getPixelFromCoordinate(c);
                    const dx = cx - sx;
                    const dy = cy - sy;
                    return dx * dx + dy * dy <= tol2;
                });

                if (idxTol !== -1) {
                    cornerIndex = idxTol;
                }

                const modifyGeometry: ModifyGeometry = {
                    geometry: g0.clone(),
                    geometry0: g0.clone(),
                    corners0,
                    cornerIndex,
                };

                f.set("modifyGeometry", modifyGeometry, true);
                pre.set(f, g0.clone());
            });
        });

        modify.on("modifyend", (e) => {
            e.features.forEach((f) => {
                const m: ModifyGeometry | undefined = f.get("modifyGeometry");
                if (m) {
                    f.setGeometry(m.geometry);
                    f.unset("modifyGeometry", true);
                }
                const before = pre.get(f);
                if (before) {
                    addUndo(() => f.setGeometry(before.clone()));
                    pre.delete(f);
                }
            });
        });

        if (layer) {
            layer.setStyle((feature) =>
                overlayStyle(feature as OlFeature<Polygon>)
            );
        }
        return modify;
    }, [source, layer, layerColor.baseColor, addUndo, overlayStyle]);

    const modify = useInteraction(
        RectEditMode.displayName + ":modify",
        active,
        createModify
    );

    useEffect(() => {
        if (!active || !olMap || !modify) return;

        const overlayLayer = modify.getOverlay?.();
        const el = olMap.getTargetElement?.();

        const handlePointerMove = debounce((evt) => {
            if (!overlayLayer) return;
            let overHandle = false;

            olMap.forEachFeatureAtPixel(
                evt.pixel,
                () => {
                    overHandle = true;
                    return true;
                },
                { layerFilter: (l) => l === overlayLayer }
            );

            draw.setActive(!overHandle);
            if (el) el.style.cursor = overHandle ? "pointer" : "";
        }, 50);

        const unPointerMove = olMap.on("pointermove", handlePointerMove);

        return () => {
            handlePointerMove.cancel();
            unByKey(unPointerMove);
            draw.setActive(active);
            if (el) el.style.cursor = "";
        };
    }, [active, olMap, modify, draw]);

    return (
        <ToggleControl
            groupId={RectEditMode.displayName}
            order={order}
            title={gettext("Rectangle")}
            onChange={setActive}
        >
            <AddIcon />
        </ToggleControl>
    );
};

RectEditMode.displayName = "RectEditMode";
