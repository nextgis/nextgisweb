import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

import type { BreadcrumbProps } from "@nextgisweb/gui/antd";

export const breadcrumbMeasureClassNames = {
  item: "resource-breadcrumb-measure-item",
  separator: "resource-breadcrumb-measure-separator",
} satisfies NonNullable<BreadcrumbProps["classNames"]>;

export function useBreadcrumbOverflow({
  items,
  containerRef,
  measureRef,
}: {
  items: readonly unknown[];
  containerRef: RefObject<HTMLDivElement | null>;
  measureRef: RefObject<HTMLDivElement | null>;
}) {
  const [visibleCount, setVisibleCount] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measuring = measureRef.current;
    if (!container || !measuring) return;

    const elements = Array.from(
      measuring.getElementsByClassName(breadcrumbMeasureClassNames.item)
    );
    const separator = measuring.getElementsByClassName(
      breadcrumbMeasureClassNames.separator
    )[0];

    const measure = () => {
      if (elements.length < 3 || !separator) {
        setVisibleCount(1);
        return;
      }

      const style = getComputedStyle(separator);
      const gap =
        separator.getBoundingClientRect().width +
        parseFloat(style.marginLeft) +
        parseFloat(style.marginRight);
      const available = container.getBoundingClientRect().width;
      const [homeWidth, menuWidth, ...pathWidths] = elements.map(
        (item) => item.getBoundingClientRect().width + gap
      );
      let requiredWidth =
        pathWidths.reduce((sum, width) => sum + width, homeWidth) - gap;
      let hiddenCount = 0;

      if (requiredWidth > available) {
        requiredWidth += menuWidth;
        while (
          requiredWidth > available &&
          hiddenCount < pathWidths.length - 1
        ) {
          requiredWidth -= pathWidths[hiddenCount];
          hiddenCount++;
        }
      }
      setVisibleCount(pathWidths.length - hiddenCount);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    for (const element of elements) resizeObserver.observe(element);
    if (separator) resizeObserver.observe(separator);
    return () => resizeObserver.disconnect();
  }, [items, containerRef, measureRef]);

  return visibleCount;
}
