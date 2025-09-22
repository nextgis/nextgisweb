import { click, pointerMove } from "ol/events/condition";
import { Select } from "ol/interaction";
import { Style } from "ol/style";
import { useCallback, useState } from "react";

import { DeleteIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { EDITING_STATES } from "../constant";
import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";

export function DeleteMode({ order }: { order?: number }) {
    const { layer, addUndo, selectStyle, selectStyleOptions } =
        useEditorContext();

    const [active, setActive] = useState(false);

    const creatHoverSelect = useCallback(() => {
        const hoverSelect = new Select({
            layers: [layer],
            style: selectStyle,
            condition: pointerMove,
            multi: false,
        });

        hoverSelect.on("select", (e) => {
            e.selected.forEach((f) =>
                f.setStyle(new Style({ ...selectStyleOptions, zIndex: 9999 }))
            );
            e.deselected.forEach((f) => f.setStyle(undefined));
        });

        return hoverSelect;
    }, [layer, selectStyle, selectStyleOptions]);

    const hover = useInteraction(
        `${EDITING_STATES.DELETING}-hover`,
        active,
        creatHoverSelect
    );

    const createSelect = useCallback(() => {
        const select = new Select({
            layers: [layer],
            style: selectStyle,
            condition: click,
            multi: false,
        });
        select.on("select", (ev) => {
            const f = ev.selected[0];
            if (f) {
                f.set("deleted", true);
                select.getFeatures().clear();
                hover.getFeatures().clear();
                addUndo(() => {
                    f.set("deleted", false);
                });
            }
        });
        return select;
    }, [addUndo, hover, layer, selectStyle]);

    useInteraction(`${EDITING_STATES.DELETING}-select`, active, createSelect);

    return (
        <ToggleControl
            groupId={EDITING_STATES.DELETING}
            title={gettext("Delete")}
            order={order}
            onChange={setActive}
        >
            <DeleteIcon />
        </ToggleControl>
    );
}
