import type { GeometryLayout, Type as OlGeometryType } from "ol/geom/Geometry";
import { Draw } from "ol/interaction";
import type { DrawEvent } from "ol/interaction/Draw";
import { useCallback, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    MapToolbarControl,
    ToggleControl,
} from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";
import type { LayerEditorMode } from "../type";

import { DrawControl } from "./component/DrawControl";

import AddCircleIcon from "@nextgisweb/icon/material/add_circle";

export interface DrawModeProps {
    geomType: OlGeometryType;
    geomLayout?: GeometryLayout;
    clearPrevious?: boolean;
    onDrawend?: (ev: DrawEvent) => Promise<void>;
    onDrawstart?: (ev: DrawEvent) => void;
}

export const DrawMode: LayerEditorMode<DrawModeProps> = ({
    order,
    geomType,
    geomLayout,
    clearPrevious,
    onDrawstart,
    onDrawend,
}) => {
    const { source, features, addUndo, id, selectStyle } = useEditorContext();

    const [active, setActive] = useState(false);

    const createDraw = useCallback(() => {
        const draw = new Draw({
            type: geomType,
            geometryLayout: geomLayout,
            source,
            features,
            style: selectStyle,
        });

        let prevUndo: undefined | (() => void) = undefined;

        draw.on("drawstart", (e: DrawEvent) => {
            if (clearPrevious) {
                const prev = source.getFeatures().slice();
                if (prev.length > 0) {
                    source.clear();
                    prevUndo = () => {
                        prev.forEach((f) => {
                            source.addFeature(f);
                        });
                    };
                }
            } else {
                prevUndo = undefined;
            }

            onDrawstart?.(e);
        });

        draw.on("drawend", async (e: DrawEvent) => {
            if (id !== undefined) {
                e.feature.set("layer_id", id);
            }

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
        geomType,
        features,
        geomLayout,
        selectStyle,
        clearPrevious,
        onDrawstart,
        onDrawend,
        addUndo,
    ]);

    const draw = useInteraction(DrawMode.displayName, active, createDraw);

    return (
        <MapToolbarControl
            id="draw-control"
            order={order}
            direction="horizontal"
            gap={2}
        >
            <ToggleControl
                groupId={DrawMode.displayName}
                order={-1}
                title={gettext("Create")}
                onChange={setActive}
            >
                <AddCircleIcon />
            </ToggleControl>
            {active && <DrawControl draw={draw} />}
        </MapToolbarControl>
    );
};

DrawMode.displayName = "DrawMode";
