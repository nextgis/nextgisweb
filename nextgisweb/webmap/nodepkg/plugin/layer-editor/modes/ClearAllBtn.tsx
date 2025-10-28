import { useCallback } from "react";
import type React from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "../context/useEditorContext";

import DeleteIcon from "@nextgisweb/icon/material/close/outline";

interface ClearAllBtnProps {
    order?: number;
    icon?: React.ReactNode;
    disabled?: boolean;
    softDelete?: boolean;
}

export const ClearAllBtn = ({
    icon,
    order,
    disabled,
    softDelete = false,
}: ClearAllBtnProps) => {
    const { source, addUndo } = useEditorContext();

    const onClick = useCallback(() => {
        const features = source?.getFeatures?.() ?? [];
        if (features.length === 0) return;

        if (softDelete) {
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
        } else {
            const removed = [...features];
            source.clear();

            addUndo(() => {
                removed.forEach((f) => source.addFeature(f));
            });
        }
    }, [addUndo, source, softDelete]);

    return (
        <ButtonControl
            onClick={onClick}
            title={gettext("Delete all")}
            order={order}
            disabled={disabled}
        >
            {icon || <DeleteIcon />}
        </ButtonControl>
    );
};

ClearAllBtn.displayName = "ClearAllMode";
