import type { Coordinate } from "ol/coordinate";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { assert } from "@nextgisweb/jsrealm/error";
import type { Display } from "@nextgisweb/webmap/display";
import PrintMap from "@nextgisweb/webmap/print-map";
import type { PrintMapSettings } from "@nextgisweb/webmap/print-map/type";

export interface PrintMapPortalProps {
    ref?: React.Ref<HTMLDivElement | null>;
    display: Display;
    settings: PrintMapSettings;
    getCenterFromUrl: () => Coordinate | null;
    onScaleChange: (scale: number) => void;
    onZoomChange: (zoom: number) => void;
    onCenterChange: (center: Coordinate) => void;
}

function setRef(
    ref: React.Ref<HTMLDivElement | null> | undefined,
    value: HTMLDivElement | null
) {
    if (!ref) return;
    if (typeof ref === "function") {
        ref(value);
    } else {
        ref.current = value;
    }
}

export function PrintMapPortal({
    ref,
    display,
    settings,
    onZoomChange,
    onScaleChange,
    onCenterChange,
    getCenterFromUrl,
}: PrintMapPortalProps) {
    const mapElRef = useRef<HTMLElement | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isMount, setIsMount] = useState(false);

    useEffect(() => {
        const mapEl = display.map.getTargetElement();
        assert(mapEl, "Map target element is not available");
        mapElRef.current = mapEl;

        const container = document.createElement("div");
        container.classList.add("print-map-pane");
        document.body.appendChild(container);
        containerRef.current = container;

        const updatePos = () => {
            if (!mapElRef.current || !containerRef.current) return;
            const { left, top } = mapElRef.current.getBoundingClientRect();
            containerRef.current.style.left = `${left}px`;
            containerRef.current.style.top = `${top}px`;
        };

        const ro = new ResizeObserver(() => updatePos());
        ro.observe(mapEl);
        resizeObserverRef.current = ro;

        const onScroll = () => updatePos();
        window.addEventListener("scroll", onScroll, { passive: true });

        updatePos();
        setIsMount(true);
        setRef(ref, container);

        return () => {
            window.removeEventListener("scroll", onScroll);
            container.parentElement?.removeChild(container);
            setIsMount(false);
            setRef(ref, null);
        };
    }, [display, ref]);

    if (!isMount || !containerRef.current) {
        return null;
    }

    return createPortal(
        <PrintMap
            settings={settings}
            display={display}
            initCenter={getCenterFromUrl()}
            onScaleChange={onScaleChange}
            onCenterChange={onCenterChange}
            onZoomChange={onZoomChange}
        />,
        containerRef.current
    );
}
