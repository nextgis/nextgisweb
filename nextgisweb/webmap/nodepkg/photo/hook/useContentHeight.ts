import { useEffect, useState } from "react";

export function useContentHeight(element: HTMLElement | null) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(() => {
      const { paddingTop, paddingBottom } = getComputedStyle(element);
      setHeight(
        element.offsetHeight -
          parseFloat(paddingTop) -
          parseFloat(paddingBottom)
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return height;
}
