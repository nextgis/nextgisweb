import { useRef } from "react";
import type ymaps from "yandex-maps";

import { usePanoramaPosition } from "../../hook/usePanoramaPosition";
import type { AvailabilityStatus, PanoramaProviderProps } from "../../type";

import { locate } from "./locate";

import "../PanoramaProvider.less";

export default function YandexPanoramaProvider({
  apiKey,
  position,
  onStatusChanged,
  onPositionChanged,
  onPovChanged,
}: PanoramaProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ymaps.panorama.Player | null>(null);
  const currentPositionRef = useRef<number[] | null>(null);
  const requestIdRef = useRef(0);

  async function setPosition(
    lat: number,
    lng: number
  ): Promise<AvailabilityStatus> {
    const requestId = ++requestIdRef.current;

    const result = await locate(apiKey, lat, lng);
    if (result.status !== "available") return result.status;
    if (requestId !== requestIdRef.current || !containerRef.current) {
      return "available";
    }

    const { panorama } = result;
    const panoramaPosition = panorama.getPosition();
    currentPositionRef.current = panoramaPosition;
    onPositionChanged(panoramaPosition[0], panoramaPosition[1]);

    if (playerRef.current) {
      const direction = playerRef.current.getDirection();
      playerRef.current.setPanorama(panorama).setDirection(direction);
      return "available";
    }

    const player = new window.ymaps.panorama.Player(
      containerRef.current,
      panorama,
      {
        controls: ["fullscreenControl", "zoomControl"],
        suppressMapOpenBlock: true,
      }
    );
    playerRef.current = player;

    player.events.add("panoramachange", () => {
      const currentPosition = player.getPanorama().getPosition();
      const [posLat, posLng] = currentPosition;
      const isSame =
        currentPositionRef.current?.[0] === posLat &&
        currentPositionRef.current?.[1] === posLng;
      if (!isSame) {
        onPositionChanged(posLat, posLng);
        currentPositionRef.current = currentPosition;
      }
    });

    player.events.add("directionchange", () => {
      const [heading, pitch] = player.getDirection();
      onPovChanged(heading, pitch);
    });

    return "available";
  }

  usePanoramaPosition(position, setPosition, onStatusChanged);

  return <div ref={containerRef} className="ngw-panorama-provider-container" />;
}
