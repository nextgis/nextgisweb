import type ymaps from "yandex-maps";

import { PANORAMA_SEARCH_RADIUS } from "../../constant";
import type {
  AvailabilityResult,
  AvailabilityStatus,
  PanoramaMessageHandler,
  PanoramaPlayer,
  PanoramaPov,
} from "../../type";

const YANDEX_LOCALES: Record<string, string> = {
  ru: "ru_RU",
  en: "en_US",
  tr: "tr_TR",
  uk: "uk_UA",
};

let scriptPromise: Promise<void> | null = null;

function loadYandexMaps(apiKey: string): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (window.ymaps) return Promise.resolve();

  const lang = YANDEX_LOCALES[ngwConfig.locale] ?? "en_US";

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=${lang}`;
    const onError = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Failed to load Yandex Maps API"));
    };
    script.onload = () => {
      try {
        window.ymaps.ready(() => resolve(), onError);
      } catch {
        onError();
      }
    };
    script.onerror = onError;
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function findNearest(
  lat: number,
  lng: number
): Promise<ymaps.IPanorama | undefined> {
  const panoramas = await window.ymaps.panorama.locate([lat, lng]);

  let nearest: ymaps.IPanorama | undefined;
  let nearestDistance = PANORAMA_SEARCH_RADIUS;
  for (const panorama of panoramas) {
    const distance = window.ymaps.coordSystem.geo.getDistance(
      [lat, lng],
      panorama.getPosition()
    );
    if (distance <= nearestDistance) {
      nearest = panorama;
      nearestDistance = distance;
    }
  }
  return nearest;
}

type LocateResult =
  | { status: "available"; panorama: ymaps.IPanorama }
  | { status: "unavailable" | "error" };

async function locate(
  apiKey: string | null,
  lat: number,
  lng: number
): Promise<LocateResult> {
  if (!apiKey) return { status: "error" };
  try {
    await loadYandexMaps(apiKey);
    const panorama = await findNearest(lat, lng);
    return panorama
      ? { status: "available", panorama }
      : { status: "unavailable" };
  } catch {
    return { status: "error" };
  }
}

export async function checkAvailability(
  apiKey: string | null,
  lat: number,
  lng: number
): Promise<AvailabilityResult> {
  const result = await locate(apiKey, lat, lng);
  if (result.status !== "available") return result;
  const [panoramaLat, panoramaLng] = result.panorama.getPosition();
  return {
    status: "available",
    position: { lat: panoramaLat, lng: panoramaLng },
  };
}

export function createPanoramaPlayer(
  container: HTMLElement,
  apiKey: string,
  handler: PanoramaMessageHandler
): PanoramaPlayer {
  const { onPositionChanged, onPovChanged } = handler;
  let player: ymaps.panorama.Player | null = null;
  let currentPosition: number[] | null = null;
  let currentRequestId = 0;
  let destroyed = false;

  const onPanoramaChanged = () => {
    if (destroyed || !player) return;
    const panoramaPosition = player.getPanorama().getPosition();
    const [posLat, posLng] = panoramaPosition;
    const isSame =
      currentPosition?.[0] === posLat && currentPosition?.[1] === posLng;
    if (!isSame) {
      onPositionChanged({ lat: posLat, lng: posLng });
      currentPosition = panoramaPosition;
    }
  };

  const onDirectionChanged = () => {
    if (destroyed || !player) return;
    const [heading, pitch] = player.getDirection();
    onPovChanged({ heading, pitch, fov: player.getSpan()[0] });
  };

  const destroyPlayer = () => {
    const current = player;
    player = null;
    currentPosition = null;
    if (!current) return;
    current.events.remove("panoramachange", onPanoramaChanged);
    current.events.remove("directionchange", onDirectionChanged);
    current.events.remove("spanchange", onDirectionChanged);
    current.destroy();
  };

  async function setPosition(
    lat: number,
    lng: number,
    pov: PanoramaPov
  ): Promise<AvailabilityStatus> {
    if (destroyed) return "error";
    const requestId = ++currentRequestId;

    const result = await locate(apiKey, lat, lng);
    if (destroyed || requestId !== currentRequestId) return "error";
    if (result.status !== "available") return result.status;

    try {
      const { panorama } = result;
      const panoramaPosition = panorama.getPosition();
      currentPosition = panoramaPosition;
      const direction = [pov.heading, pov.pitch];

      if (player) {
        player.setPanorama(panorama).setDirection(direction);
      } else {
        player = new window.ymaps.panorama.Player(container, panorama, {
          direction,
          controls: ["fullscreenControl", "zoomControl"],
          suppressMapOpenBlock: true,
        });
        player.events.add("panoramachange", onPanoramaChanged);
        player.events.add("directionchange", onDirectionChanged);
        player.events.add("spanchange", onDirectionChanged);
      }

      onPositionChanged({ lat: panoramaPosition[0], lng: panoramaPosition[1] });
      onDirectionChanged();
      return "available";
    } catch {
      destroyPlayer();
      return "error";
    }
  }

  return {
    show: ({ lat, lng }, pov) => setPosition(lat, lng, pov),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      currentRequestId++;
      destroyPlayer();
    },
  };
}
