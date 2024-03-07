import { useCallback, useEffect, useRef, useState } from "react";
import type { DependencyList, MutableRefObject } from "react";

export function useFit({
    ref,
    deps = [],
}: {
    ref: MutableRefObject<HTMLDivElement | null>;
    deps?: DependencyList;
}) {
    const [isFit, setIsFit] = useState(false);
    const isFitStopRef = useRef<number>();

    const checkFit = useCallback(() => {
        const element = ref.current;
        if (element) {
            const elementStyles = window.getComputedStyle(element);
            const elementWidth = Math.floor(parseFloat(elementStyles.width));

            if (!isFitStopRef.current) {
                const children = Array.from(element.children) as HTMLElement[];

                let contentWidth = 0;
                children.forEach((child, index) => {
                    const childStyles = window.getComputedStyle(child);
                    contentWidth += Math.floor(parseFloat(childStyles.width));

                    if (index < children.length - 1) {
                        const gap = parseInt(
                            window
                                .getComputedStyle(element)
                                .getPropertyValue("column-gap"),
                            10
                        );
                        contentWidth += isNaN(gap) ? 0 : gap;
                    }
                });
                const increasedElementWidth =
                    elementWidth + elementWidth * 0.05;
                if (contentWidth > increasedElementWidth) {
                    isFitStopRef.current = contentWidth;
                    setIsFit(false);
                } else {
                    setIsFit(true);
                }
            } else {
                const decreasedElementWidth =
                    elementWidth - elementWidth * 0.05;
                setIsFit(decreasedElementWidth >= isFitStopRef.current);
            }
        }
    }, [ref]);

    useEffect(() => {
        const element = ref.current;
        isFitStopRef.current = undefined;
        if (element) {
            const resizeObserver = new ResizeObserver(checkFit);
            resizeObserver.observe(element);
            return () => {
                resizeObserver.unobserve(element);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkFit, ref, ...deps]);

    return isFit;
}
