/// <reference types="google.maps" />
import { useRef } from "react";

import { usePanoramaPosition } from "../../hook/usePanoramaPosition";
import type { AvailabilityStatus, PanoramaProviderProps } from "../../type";

import { locate } from "./locate";

import "../PanoramaProvider.less";

export default function GooglePanoramaProvider({
  apiKey,
  position,
  onStatusChanged,
  onPositionChanged,
  onPovChanged,
}: PanoramaProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const currentPositionRef = useRef<google.maps.LatLng | null>(null);
  const requestIdRef = useRef(0);

  // Google SDK sometimes removes its main canvas
  // from DOM on display: none in Firefox.
  // Remains unhandled here.
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

    const { latLng } = result;
    currentPositionRef.current = latLng;
    onPositionChanged(latLng.lat(), latLng.lng());

    if (playerRef.current) {
      playerRef.current.setPosition(latLng);
      return "available";
    }

    const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
      position: currentPositionRef.current,
      visible: true,
      enableCloseButton: false,
      addressControl: false,
    });
    playerRef.current = panorama;

    panorama.addListener("position_changed", () => {
      const currentPosition = panorama.getPosition();
      const isSame = currentPositionRef.current?.equals(currentPosition);
      if (currentPosition && !isSame) {
        onPositionChanged(currentPosition.lat(), currentPosition.lng());
        currentPositionRef.current = currentPosition;
      }
    });

    panorama.addListener("pov_changed", () => {
      const pov = panorama.getPov();
      onPovChanged(pov.heading, pov.pitch);
    });

    return "available";
  }

  usePanoramaPosition(position, setPosition, onStatusChanged);

  return <div ref={containerRef} className="ngw-panorama-provider-container" />;
}
