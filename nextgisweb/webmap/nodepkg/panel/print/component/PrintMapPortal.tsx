import type { Coordinate } from "ol/coordinate";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { assert } from "@nextgisweb/jsrealm/error";
import type { Display } from "@nextgisweb/webmap/display";
import PrintMap from "@nextgisweb/webmap/print-map";
import type { PrintMapStore } from "@nextgisweb/webmap/print-map/PrintMapStore";
import type { PrintMapSettings } from "@nextgisweb/webmap/print-map/type";

export interface PrintMapPortalProps {
    ref?: React.Ref<HTMLDivElement | null>;
    display: Display;
    initCenter?: Coordinate | null;
    mapSettings: PrintMapSettings;
    printMapStore: PrintMapStore;
    onScaleChange: (scale: number) => void;
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
    initCenter,
    mapSettings,
    printMapStore,
    onScaleChange,
    onCenterChange,
}: PrintMapPortalProps) {
    const mapElRef = useRef<HTMLElement | null>(null);

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

        const ro = new ResizeObserver(updatePos);
        ro.observe(mapEl);

        window.addEventListener("scroll", updatePos, { passive: true });

        updatePos();
        setIsMount(true);
        setRef(ref, container);

        return () => {
            ro.disconnect();
            window.removeEventListener("scroll", updatePos);
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
            display={display}
            settings={mapSettings}
            initCenter={initCenter}
            printMapStore={printMapStore}
            onScaleChange={onScaleChange}
            onCenterChange={onCenterChange}
        />,
        containerRef.current
    );
}
