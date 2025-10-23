import { useCallback } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "../context/useEditorContext";
import type { LayerEditorMode } from "../type";

import DeleteIcon from "@nextgisweb/icon/material/close/outline";

export const ClearAllMode: LayerEditorMode = ({ order }) => {
    const { source, addUndo } = useEditorContext();

    const onClick = useCallback(() => {
        const features = source?.getFeatures?.() ?? [];

        const snapshot = features.map((f) => ({
            feature: f,
            prev: f.get("deleted") ?? false,
        }));

        features.forEach((f) => f.set("deleted", true));

        addUndo(() => {
            snapshot.forEach(({ feature, prev }) =>
                feature.set("deleted", prev)
            );
        });
    }, [addUndo, source]);

    return (
        <ButtonControl
            onClick={onClick}
            title={gettext("Clear all")}
            order={order}
        >
            <DeleteIcon />
        </ButtonControl>
    );
};

ClearAllMode.displayName = "ClearAllMode";
