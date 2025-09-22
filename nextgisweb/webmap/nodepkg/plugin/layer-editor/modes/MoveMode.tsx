import type { Feature as OlFeature } from "ol";
import { pointerMove } from "ol/events/condition";
import type { Geometry } from "ol/geom";
import { Select, Translate } from "ol/interaction";
import Style from "ol/style/Style";
import { useCallback, useRef, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { EDITING_STATES } from "../constant";
import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";

import MoveIcon from "@nextgisweb/icon/material/open_with";

export function MoveMode({ order }: { order?: number }) {
    const { layer, addUndo, selectStyle, selectStyleOptions } =
        useEditorContext();

    const [active, setActive] = useState(false);

    const isDraggingRef = useRef(false);

    const createHover = useCallback(() => {
        const hoverSelect = new Select({
            layers: [layer],
            style: selectStyle,
            condition: pointerMove,
            multi: false,
        });

        hoverSelect.on("select", (e) => {
            if (isDraggingRef.current) return;
            e.selected.forEach((f) =>
                f.setStyle(new Style({ ...selectStyleOptions, zIndex: 9999 }))
            );
            e.deselected.forEach((f) => f.setStyle(undefined));
        });

        return hoverSelect;
    }, [layer, selectStyle, selectStyleOptions]);

    const hover = useInteraction(
        `${EDITING_STATES.MOVING}-hover`,
        active,
        createHover
    );

    const createTranslate = useCallback(() => {
        const trans = new Translate({
            layers: [layer],
            features: hover.getFeatures(),
        });

        const pre = new WeakMap<OlFeature<Geometry>, Geometry>();
        trans.on("translatestart", (e) => {
            isDraggingRef.current = true;
            hover.setActive(false);
            e.features.forEach((f) => {
                const g = f.getGeometry();
                if (g) {
                    pre.set(f, g.clone());
                }
            });
        });
        trans.on("translateend", (e) => {
            isDraggingRef.current = false;
            hover.setActive(true);
            e.features.forEach((f) => {
                const before = pre.get(f);
                if (before) {
                    addUndo(() => f.setGeometry(before.clone()));
                }
                pre.delete(f);
            });
        });

        return trans;
    }, [addUndo, hover, layer]);

    useInteraction(
        `${EDITING_STATES.MOVING}-translate`,
        active,
        createTranslate
    );

    return (
        <ToggleControl
            groupId={EDITING_STATES.MOVING}
            title={gettext("Move")}
            order={order}
            onChange={setActive}
        >
            <MoveIcon />
        </ToggleControl>
    );
}
