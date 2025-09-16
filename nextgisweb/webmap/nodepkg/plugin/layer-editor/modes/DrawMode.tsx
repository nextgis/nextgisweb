import { Draw } from "ol/interaction";
import type { DrawEvent } from "ol/interaction/Draw";
import { useCallback, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    MapToolbarControl,
    ToggleControl,
} from "@nextgisweb/webmap/map-component";

import { EDITING_STATES } from "../constant";
import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";

import { DrawControl } from "./component/DrawControl";

import CreateIcon from "@nextgisweb/icon/material/add_box";

export interface DrawModeProps {
    order?: number;
    onDrawend?: (ev: DrawEvent) => Promise<void>;
}

export function DrawMode({ order, onDrawend }: DrawModeProps) {
    const { source, features, geomType, geomLayout, addUndo, id, selectStyle } =
        useEditorContext();

    const [active, setActive] = useState(false);

    const createDraw = useCallback(() => {
        const draw = new Draw({
            type: geomType,
            geometryLayout: geomLayout,
            source,
            features,
            style: selectStyle,
        });
        draw.on("drawend", async (e: DrawEvent) => {
            if (id !== undefined) {
                e.feature.set("layer_id", id);
            }
            const undo = () => {
                source.removeFeature(e.feature);
            };
            try {
                await onDrawend?.(e);
                addUndo(undo);
            } catch {
                undo();
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
        onDrawend,
        addUndo,
    ]);

    const draw = useInteraction(EDITING_STATES.CREATING, active, createDraw);

    return (
        <MapToolbarControl
            id="draw-control"
            order={order}
            direction="horizontal"
            gap={2}
        >
            <ToggleControl
                groupId={EDITING_STATES.CREATING}
                order={-1}
                title={gettext("Creating")}
                onChange={setActive}
            >
                <CreateIcon />
            </ToggleControl>
            {active && <DrawControl draw={draw} />}
        </MapToolbarControl>
    );
}
