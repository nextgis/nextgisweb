import { useEffect, useState } from "react";

export function useContentHeight(element: HTMLElement | null) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return height;
}
