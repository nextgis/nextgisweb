import { useEffect, useState } from "react";

export function useScrollEdges(element: HTMLElement | null, content: unknown) {
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    if (!element) {
      setEdges({ start: false, end: false });
      return;
    }
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      const start = scrollLeft > 0;
      const end = scrollLeft + clientWidth < scrollWidth - 1;
      setEdges((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end }
      );
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [element, content]);

  return edges;
}
