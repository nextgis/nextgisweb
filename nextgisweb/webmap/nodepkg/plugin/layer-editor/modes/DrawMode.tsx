import { Draw } from "ol/interaction";
import type { DrawEvent } from "ol/interaction/Draw";
import { useCallback, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { EDITING_STATES } from "../constant";
import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";

import CreateIcon from "@nextgisweb/icon/material/add_box";

export interface DrawModeProps {
    order?: number;
    onDrawend?: (ev: DrawEvent) => void;
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
        draw.on("drawend", (e: DrawEvent) => {
            if (id !== undefined) {
                e.feature.set("layer_id", id);
            }
            addUndo(() => {
                source.removeFeature(e.feature);
            });
            onDrawend?.(e);
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

    useInteraction(EDITING_STATES.CREATING, active, createDraw);

    return (
        <ToggleControl
            groupId={EDITING_STATES.CREATING}
            title={gettext("Creating")}
            order={order}
            onChange={setActive}
        >
            <CreateIcon />
        </ToggleControl>
    );
}
