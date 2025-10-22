import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Display } from "@nextgisweb/webmap/display";
import PrintMap from "@nextgisweb/webmap/print-map";
import type { PrintMapStore } from "@nextgisweb/webmap/print-map/store";

export interface PrintMapPortalProps {
    ref?: React.Ref<HTMLDivElement | null>;
    display: Display;
    printMapStore: PrintMapStore;
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
    printMapStore,
}: PrintMapPortalProps) {
    const mapElRef = useRef<HTMLElement | null>(null);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isMount, setIsMount] = useState(false);

    useEffect(() => {
        const mapEl = display.map.targetElement;

        if (!mapEl) return;
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
    }, [display, display.map.targetElement, ref]);

    if (!isMount || !containerRef.current) {
        return null;
    }

    return createPortal(
        <PrintMap display={display} printMapStore={printMapStore} />,
        containerRef.current
    );
}
