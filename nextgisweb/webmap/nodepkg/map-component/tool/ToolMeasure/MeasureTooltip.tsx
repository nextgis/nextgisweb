import Overlay from "ol/Overlay";
import type { Options as OverlayOptions } from "ol/Overlay";
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@nextgisweb/gui/icon";

import { useMapContext } from "../../context/useMapContext";

export interface MeasureTooltipProps
    extends Pick<OverlayOptions, "position" | "offset"> {
    children?: React.ReactNode;
    staticMode?: boolean;
    onClose: () => void;
}

export function MeasureTooltip({
    offset = [0, -15],
    children,
    position,
    staticMode = false,
    onClose,
}: MeasureTooltipProps) {
    const { mapStore } = useMapContext();
    const [overlay, setOverlay] = useState<Overlay | null>(null);

    const positionRef = useRef(position);
    const offsetRef = useRef(offset);

    const calcOffset = useMemo(() => {
        return staticMode ? [0, -7] : offset;
    }, [staticMode, offset]);

    useEffect(() => {
        const el = document.createElement("div");
        const overlay = new Overlay({
            offset: offsetRef.current,
            element: el,
            position: positionRef.current,
            stopEvent: true,
            positioning: "bottom-center",
            insertFirst: false,
        });
        setOverlay(overlay);
        mapStore.olMap.addOverlay(overlay);

        return () => {
            mapStore.olMap.removeOverlay(overlay);
        };
    }, [mapStore.olMap]);

    const element = useMemo(() => overlay?.getElement(), [overlay]);

    useEffect(() => {
        if (overlay) {
            overlay.setPosition(position);
        }
        positionRef.current = position;
    }, [overlay, position]);

    useEffect(() => {
        offsetRef.current = offset;
    }, [offset, overlay]);

    useEffect(() => {
        if (overlay) {
            overlay.setOffset(calcOffset);
        }
    }, [calcOffset, overlay]);

    if (!element) {
        return null;
    }

    return createPortal(
        <div
            className={
                staticMode
                    ? "ol-tooltip ol-tooltip-static"
                    : "ol-tooltip ol-tooltip-measure"
            }
        >
            <span className="tooltip-content">{children}</span>
            {staticMode && (
                <button
                    className="tooltip-close-button"
                    onClick={onClose}
                    type="button"
                    aria-label="Close"
                >
                    <CloseIcon />
                </button>
            )}
        </div>,
        element
    );
}
