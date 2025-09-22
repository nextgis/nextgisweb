import { Snap } from "ol/interaction";
import { useCallback } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "./context/useEditorContext";
import { useInteraction } from "./hook/useInteraction";

import CenterFocusWeakIcon from "@nextgisweb/icon/material/center_focus_weak/outline";

export function SnapToggle({
    order,
    value,
    onChange,
}: {
    order: number;
    value: boolean;
    onChange: (val: boolean) => void;
}) {
    const { source } = useEditorContext();

    const createSnap = useCallback(() => new Snap({ source }), [source]);

    useInteraction("snapping", value, createSnap);

    return (
        <ToggleControl
            title={(status) =>
                status
                    ? gettext("Disable snapping")
                    : gettext("Enable snapping")
            }
            value={value}
            onChange={onChange}
            order={order}
        >
            <CenterFocusWeakIcon />
        </ToggleControl>
    );
}
