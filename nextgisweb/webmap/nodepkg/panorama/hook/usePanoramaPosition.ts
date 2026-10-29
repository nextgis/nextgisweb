import { useEffect, useRef } from "react";

import type { AvailabilityStatus, PanoramaPosition } from "../type";

export function usePanoramaPosition(
  position: PanoramaPosition,
  show: (lat: number, lng: number) => Promise<AvailabilityStatus>,
  onStatusChanged: (status: AvailabilityStatus) => void
) {
  const showRef = useRef(show);
  showRef.current = show;

  useEffect(() => {
    let cancelled = false;
    showRef.current(position.lat, position.lng).then((status) => {
      if (!cancelled) onStatusChanged(status);
    });
    return () => {
      cancelled = true;
    };
  }, [position, onStatusChanged]);
}
