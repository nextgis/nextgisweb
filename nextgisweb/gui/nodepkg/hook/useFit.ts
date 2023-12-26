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
            const elementWidth = element.offsetWidth;
            if (!isFitStopRef.current) {
                const children = Array.from(element.children) as HTMLElement[];

                let contentWidth = 0;
                children.forEach((child, index) => {
                    contentWidth += child.offsetWidth;
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

                if (contentWidth > elementWidth) {
                    isFitStopRef.current = contentWidth;
                    setIsFit(false);
                } else {
                    setIsFit(true);
                }
            } else {
                setIsFit(elementWidth >= isFitStopRef.current);
            }
        }
    }, [ref]);

    useEffect(() => {
        const element = ref.current;
        if (element) {
            const resizeObserver = new ResizeObserver(checkFit);
            resizeObserver.observe(element);
            return () => {
                resizeObserver.unobserve(element);
            };
        }
    }, [checkFit, ref, deps]);

    return isFit;
}
