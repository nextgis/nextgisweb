import { always } from "ol/events/condition";
import { DragZoom } from "ol/interaction";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { useMapContext } from "../context/useMapContext";
import { ToggleControl } from "../control";
import type { ToggleControlProps } from "../control";

import ZoomInIcon from "@nextgisweb/icon/material/zoom_in";
import ZoomOutIcon from "@nextgisweb/icon/material/zoom_out";

type ToolZoomProps = { out?: boolean } & ToggleControlProps;

export default function ToolZoom({ out = false, ...rest }: ToolZoomProps) {
    const { mapStore } = useMapContext();
    const interactionRef = useRef<DragZoom | null>(null);

    const { targetElement, olMap } = mapStore;
    const title = useMemo(
        () => (out ? gettext("Zoom out") : gettext("Zoom in")),
        [out]
    );

    useEffect(() => {
        const dz = new DragZoom({ condition: always, out });
        dz.setActive(false);
        olMap.addInteraction(dz);
        interactionRef.current = dz;

        return () => {
            try {
                dz.setActive(false);
                olMap.removeInteraction(dz);
            } finally {
                interactionRef.current = null;
                const el = targetElement;
                if (el) {
                    el.style.cursor = "auto";
                }
            }
        };
    }, [olMap, targetElement, out]);

    const setActive = useCallback(
        (active: boolean) => {
            const dz = interactionRef.current;
            if (!dz) return;
            dz.setActive(active);
            const el = targetElement;
            if (el)
                el.style.cursor = active
                    ? out
                        ? "zoom-out"
                        : "zoom-in"
                    : "auto";
        },
        [targetElement, out]
    );

    return (
        <ToggleControl {...rest} title={title} onChange={setActive}>
            {out ? <ZoomOutIcon /> : <ZoomInIcon />}
        </ToggleControl>
    );
}
