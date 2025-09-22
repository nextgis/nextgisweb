import { useEffect, useState } from "react";

export function useContainerWidth(element: HTMLElement | null) {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!element) return;

        const observer = new ResizeObserver(([entry]) => {
            setWidth(entry.contentRect.width);
        });

        setWidth(element.getBoundingClientRect().width);

        observer.observe(element);
        return () => observer.disconnect();
    }, [element]);

    return width;
}
