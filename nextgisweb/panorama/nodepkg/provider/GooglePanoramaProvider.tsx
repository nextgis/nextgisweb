/// <reference types="google.maps" />
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useRef } from "react";

import { usePanoramaEmitter } from "../hook/usePanoramaEmitter";
import type {
  AvailabilityStatus,
  PanoramaMessageHandler,
  PanoramaProvider,
  PanoramaProviderProps,
} from "../type";

import "./PanoramaProvider.less";

let libraryPromise: Promise<google.maps.StreetViewLibrary> | null = null;
let optionsSet = false;

function loadStreetView(
  apiKey: string | null
): Promise<google.maps.StreetViewLibrary> {
  if (!optionsSet) {
    setOptions(apiKey ? { key: apiKey, v: "weekly" } : { v: "weekly" });
    optionsSet = true;
  }
  if (!libraryPromise) {
    libraryPromise = importLibrary("streetView");
  }
  return libraryPromise;
}

export default function GooglePanoramaProvider({
  apiKey,
}: PanoramaProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const sdkPromiseRef = useRef<Promise<google.maps.StreetViewService> | null>(
    null
  );
  const currentPositionRef = useRef<google.maps.LatLng | null>(null);
  const requestIdRef = useRef(0);

  function ensureSdk(): Promise<google.maps.StreetViewService> {
    if (!sdkPromiseRef.current) {
      sdkPromiseRef.current = loadStreetView(apiKey).then(
        ({ StreetViewService }) => new StreetViewService()
      );
    }
    return sdkPromiseRef.current;
  }

  async function checkAvailability(
    lat: number,
    lng: number
  ): Promise<AvailabilityStatus> {
    let service: google.maps.StreetViewService;
    try {
      service = await ensureSdk();
    } catch {
      return "error";
    }

    try {
      const { data } = await service.getPanorama({
        location: { lat, lng },
        radius: 50,
      });
      return data.location?.latLng ? "available" : "unavailable";
    } catch (e) {
      return (e as { code?: string })?.code === "ZERO_RESULTS"
        ? "unavailable"
        : "error";
    }
  }

  // Google SDK sometimes removes its main canvas
  // from DOM on modal close in Firefox.
  // Remains unhandled here.
  function showPosition(
    lat: number,
    lng: number,
    handler: PanoramaMessageHandler
  ) {
    if (
      currentPositionRef.current &&
      currentPositionRef.current.lat() === lat &&
      currentPositionRef.current.lng() === lng
    ) {
      return;
    }

    const requestId = ++requestIdRef.current;

    ensureSdk()
      .then((service) =>
        service.getPanorama({ location: { lat, lng }, radius: 50 })
      )
      .then(({ data }) => {
        if (requestId !== requestIdRef.current) return;
        if (!containerRef.current) return;

        if (!data.location?.latLng) {
          handler.onUnavailable();
          return;
        }

        currentPositionRef.current = data.location.latLng;

        if (playerRef.current) {
          playerRef.current.setPosition(data.location.latLng);
          return;
        }

        const panorama = new google.maps.StreetViewPanorama(
          containerRef.current,
          {
            position: currentPositionRef.current,
            visible: true,
            enableCloseButton: false,
            addressControl: false,
          }
        );
        playerRef.current = panorama;

        panorama.addListener("position_changed", () => {
          const currentPosition = panorama.getPosition();
          const isSame = currentPositionRef.current?.equals(currentPosition);
          if (currentPosition && !isSame) {
            handler.onPositionChanged(
              currentPosition.lat(),
              currentPosition.lng()
            );
            currentPositionRef.current = currentPosition;
          }
        });

        panorama.addListener("pov_changed", () => {
          const pov = panorama.getPov();
          handler.onPovChanged(pov.heading, pov.pitch);
        });
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        handler.onUnavailable();
      });
  }

  const provider: PanoramaProvider = { checkAvailability, showPosition };
  usePanoramaEmitter(provider);

  return <div ref={containerRef} className="ngw-panorama-provider-container" />;
}
