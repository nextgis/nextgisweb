import { useEffect } from "react";

export function useWheelHorizontalScroll(element: HTMLElement | null) {
  useEffect(() => {
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      const { deltaX, deltaY } = event;
      if (deltaY === 0 || Math.abs(deltaX) > Math.abs(deltaY)) return;
      const maxScroll = element.scrollWidth - element.clientWidth;
      if (maxScroll <= 0) return;
      const atStart = element.scrollLeft <= 0 && deltaY < 0;
      const atEnd = element.scrollLeft >= maxScroll - 1 && deltaY > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? element.clientWidth
            : 1;
      element.scrollLeft += deltaY * unit;
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [element]);
}
