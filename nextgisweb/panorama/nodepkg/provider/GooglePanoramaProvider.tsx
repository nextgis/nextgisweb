/// <reference types="google.maps" />
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useRef } from "react";

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
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const sdkPromiseRef = useRef<Promise<google.maps.StreetViewService> | null>(
    null
  );
  const positionLockedRef = useRef(false);
  const lastLatLngRef = useRef<google.maps.LatLng | null>(null);
  const lastHandlerRef = useRef<PanoramaMessageHandler | null>(null);

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

  function createPanorama(
    position: google.maps.LatLng,
    handler: PanoramaMessageHandler
  ) {
    if (!containerRef.current) return;

    const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
      position,
      visible: true,
      enableCloseButton: false,
      addressControl: false,
    });
    panoramaRef.current = panorama;

    panorama.addListener("position_changed", () => {
      if (positionLockedRef.current) return;
      positionLockedRef.current = true;
      setTimeout(() => {
        positionLockedRef.current = false;
      }, 400);

      const currentPosition = panorama.getPosition();
      if (currentPosition) {
        handler.onPositionChanged(currentPosition.lat(), currentPosition.lng());
      }
    });

    panorama.addListener("pov_changed", () => {
      const pov = panorama.getPov();
      handler.onPovChanged(pov.heading, pov.pitch);
    });
  }

  function showPosition(
    lat: number,
    lng: number,
    handler: PanoramaMessageHandler
  ) {
    ensureSdk()
      .then((service) =>
        service.getPanorama({ location: { lat, lng }, radius: 50 })
      )
      .then(({ data }) => {
        if (!containerRef.current) return;

        if (!data.location?.latLng) {
          handler.onUnavailable();
          return;
        }

        lastLatLngRef.current = data.location.latLng;
        lastHandlerRef.current = handler;

        if (!panoramaRef.current) {
          createPanorama(data.location.latLng, handler);
        } else {
          panoramaRef.current.setPosition(data.location.latLng);
          panoramaRef.current.setVisible(true);
        }
      })
      .catch(() => {
        handler.onUnavailable();
      });
  }

  const provider: PanoramaProvider = { checkAvailability, showPosition };
  usePanoramaEmitter(provider);

  useEffect(() => {
    function handleResize() {
      const isVisible = window.innerWidth > 0 && window.innerHeight > 0;

      if (
        isVisible &&
        panoramaRef.current &&
        lastLatLngRef.current &&
        lastHandlerRef.current
      ) {
        panoramaRef.current = null;
        createPanorama(lastLatLngRef.current, lastHandlerRef.current);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <div ref={containerRef} className="ngw-panorama-provider-container" />;
}
