/// <reference types="google.maps" />
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

import { PANORAMA_SEARCH_RADIUS } from "../../constant";
import type {
  AvailabilityResult,
  AvailabilityStatus,
  PanoramaMessageHandler,
  PanoramaPlayer,
  PanoramaPosition,
  PanoramaPov,
} from "../../type";

let libraryPromise: Promise<google.maps.StreetViewLibrary> | null = null;
let optionsSet = false;

function loadLibrary(
  apiKey: string | null
): Promise<google.maps.StreetViewLibrary> {
  if (!optionsSet) {
    setOptions(apiKey ? { key: apiKey, v: "weekly" } : { v: "weekly" });
    optionsSet = true;
  }
  if (!libraryPromise) {
    libraryPromise = importLibrary("streetView").catch((err) => {
      libraryPromise = null;
      throw err;
    });
  }
  return libraryPromise;
}

let servicePromise: Promise<google.maps.StreetViewService> | null = null;

function loadService(
  apiKey: string | null
): Promise<google.maps.StreetViewService> {
  if (!servicePromise) {
    servicePromise = loadLibrary(apiKey)
      .then(({ StreetViewService }) => new StreetViewService())
      .catch((err) => {
        servicePromise = null;
        throw err;
      });
  }
  return servicePromise;
}

type LocateResult =
  | { status: "available"; latLng: google.maps.LatLng }
  | { status: "unavailable" | "error" };

async function locate(
  apiKey: string | null,
  lat: number,
  lng: number
): Promise<LocateResult> {
  try {
    const service = await loadService(apiKey);
    const { data } = await service.getPanorama({
      location: { lat, lng },
      radius: PANORAMA_SEARCH_RADIUS,
    });
    const latLng = data.location?.latLng;
    return latLng ? { status: "available", latLng } : { status: "unavailable" };
  } catch (e) {
    return (e as { code?: string })?.code === "ZERO_RESULTS"
      ? { status: "unavailable" }
      : { status: "error" };
  }
}

export async function checkAvailability(
  apiKey: string | null,
  lat: number,
  lng: number
): Promise<AvailabilityResult> {
  const result = await locate(apiKey, lat, lng);
  if (result.status !== "available") return result;
  const { latLng } = result;
  return {
    status: "available",
    position: { lat: latLng.lat(), lng: latLng.lng() },
  };
}

export function createPanoramaPlayer(
  container: HTMLElement,
  apiKey: string,
  handler: PanoramaMessageHandler
): PanoramaPlayer {
  let player: google.maps.StreetViewPanorama | null = null;
  let currentPosition: google.maps.LatLng | null = null;
  let currentRequestId = 0;
  let destroyed = false;

  function onPovChanged() {
    if (destroyed || !player) return;
    const pov = player.getPov();
    handler.onPovChanged({
      heading: pov.heading,
      pitch: pov.pitch,
      fov: 180 / 2 ** player.getZoom(),
    });
  }

  function destroyPlayer() {
    if (!player) return;
    const panorama = player;
    player = null;
    currentPosition = null;
    google.maps.event.clearInstanceListeners(panorama);
    panorama.setVisible(false);
    container.replaceChildren();
  }

  // Google SDK sometimes removes its main canvas
  // from DOM on display: none in Firefox.
  // Remains unhandled here.
  async function setPosition(
    { lat, lng }: PanoramaPosition,
    pov: PanoramaPov
  ): Promise<AvailabilityStatus> {
    if (destroyed) return "error";
    const requestId = ++currentRequestId;

    const result = await locate(apiKey, lat, lng);
    if (destroyed || requestId !== currentRequestId) return "error";
    if (result.status !== "available") return result.status;

    try {
      const { latLng } = result;
      const { heading, pitch } = pov;
      currentPosition = latLng;

      if (player) {
        player.setPosition(latLng);
        player.setPov({ heading, pitch });
      } else {
        const panorama = new google.maps.StreetViewPanorama(container, {
          position: latLng,
          pov: { heading, pitch },
          visible: true,
          enableCloseButton: false,
          addressControl: false,
        });
        player = panorama;

        panorama.addListener("position_changed", () => {
          if (destroyed || player !== panorama) return;
          const nextPosition = panorama.getPosition();
          const isSame = currentPosition?.equals(nextPosition);
          if (nextPosition && !isSame) {
            currentPosition = nextPosition;
            handler.onPositionChanged({
              lat: nextPosition.lat(),
              lng: nextPosition.lng(),
            });
          }
        });

        panorama.addListener("pov_changed", () => {
          if (destroyed || player !== panorama) return;
          onPovChanged();
        });

        panorama.addListener("zoom_changed", () => {
          if (destroyed || player !== panorama) return;
          onPovChanged();
        });
      }

      handler.onPositionChanged({ lat: latLng.lat(), lng: latLng.lng() });
      onPovChanged();
      return "available";
    } catch {
      destroyPlayer();
      return "error";
    }
  }

  return {
    show: setPosition,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      currentRequestId++;
      destroyPlayer();
    },
  };
}
