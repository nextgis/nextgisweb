import type { Feature as OlFeature } from "ol";
import { shiftKeyOnly, singleClick } from "ol/events/condition";
import type { Geometry } from "ol/geom";
import { Modify } from "ol/interaction";
import type { ModifyEvent } from "ol/interaction/Modify";
import { useCallback, useState } from "react";

import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { EDITING_STATES } from "../constant";
import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";

export function ModifyMode({ order }: { order: number }) {
    const { features, addUndo, selectStyle } = useEditorContext();

    const [active, setActive] = useState(false);

    const createInteraction = useCallback(() => {
        const pre = new WeakMap<OlFeature<Geometry>, Geometry>();

        const modify = new Modify({
            features,
            style: selectStyle,
            deleteCondition: (evt) => shiftKeyOnly(evt) && singleClick(evt),
        });
        modify.on("modifystart", (e: ModifyEvent) => {
            e.features.forEach((f) => {
                const g = f.getGeometry();
                if (g) pre.set(f, g.clone());
            });
        });

        modify.on("modifyend", (e: ModifyEvent) => {
            e.features.forEach((f) => {
                const before = pre.get(f);
                if (before) {
                    addUndo(() => f.setGeometry(before.clone()));
                    pre.delete(f);
                }
            });
        });
        return modify;
    }, [addUndo, features, selectStyle]);

    useInteraction(EDITING_STATES.MODIFYING, active, createInteraction);

    return (
        <ToggleControl
            groupId={EDITING_STATES.MODIFYING}
            title={gettext("Modifying")}
            order={order}
            onChange={setActive}
        >
            <EditIcon />
        </ToggleControl>
    );
}
