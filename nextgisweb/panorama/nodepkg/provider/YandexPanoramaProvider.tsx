import { useRef } from "react";
import type ymaps from "yandex-maps";

import { usePanoramaEmitter } from "../hook/usePanoramaEmitter";
import type {
  AvailabilityStatus,
  PanoramaMessageHandler,
  PanoramaProvider,
  PanoramaProviderProps,
} from "../type";

import "./PanoramaProvider.less";

const YANDEX_LOCALES: Record<string, string> = {
  ru: "ru_RU",
  en: "en_US",
  tr: "tr_TR",
  uk: "uk_UA",
};

let scriptPromise: Promise<void> | null = null;

function loadYandexMaps(apiKey: string): Promise<void> {
  if (window.ymaps) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const lang = YANDEX_LOCALES[ngwConfig.locale] ?? "ru_RU";

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=${lang}`;
    script.onload = () => window.ymaps.ready(() => resolve());
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Yandex Maps API"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function YandexPanoramaProvider({
  apiKey,
}: PanoramaProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ymaps.panorama.Player | null>(null);
  const sdkPromiseRef = useRef<Promise<void> | null>(null);
  const currentPositionRef = useRef<[number, number] | null>(null);

  function ensureSdk(): Promise<void> {
    if (!sdkPromiseRef.current) {
      sdkPromiseRef.current = apiKey
        ? loadYandexMaps(apiKey)
        : Promise.reject(new Error("No API key"));
    }
    return sdkPromiseRef.current;
  }

  async function checkAvailability(
    lat: number,
    lng: number
  ): Promise<AvailabilityStatus> {
    try {
      await ensureSdk();
    } catch {
      return "error";
    }

    try {
      const panoramas = await window.ymaps.panorama.locate([lat, lng]);
      return panoramas.length > 0 ? "available" : "unavailable";
    } catch {
      return "error";
    }
  }

  function showPosition(
    lat: number,
    lng: number,
    handler: PanoramaMessageHandler
  ) {
    if (
      currentPositionRef.current &&
      currentPositionRef.current[0] === lat &&
      currentPositionRef.current[1] === lng
    ) {
      return;
    }

    ensureSdk()
      .then(() => window.ymaps.panorama.locate([lat, lng]))
      .then((panoramas: ymaps.IPanorama[]) => {
        if (!containerRef.current) return;

        if (panoramas.length === 0) {
          handler.onUnavailable();
          return;
        }

        currentPositionRef.current = [lat, lng];

        if (playerRef.current) {
          playerRef.current.setPanorama(panoramas[0]);
          return;
        }

        const player = new window.ymaps.panorama.Player(
          containerRef.current,
          panoramas[0],
          {
            controls: ["fullscreenControl", "panoramaName", "zoomControl"],
            suppressMapOpenBlock: true,
          }
        );
        playerRef.current = player;

        player.events.add("panoramachange", () => {
          const [posLat, posLng] = player.getPanorama().getPosition();
          currentPositionRef.current = [posLat, posLng];
          handler.onPositionChanged(posLat, posLng);
        });

        player.events.add("directionchange", () => {
          const [heading, pitch] = player.getDirection();
          handler.onPovChanged(heading, pitch);
        });
      })
      .catch(() => {
        handler.onUnavailable();
      });
  }

  const provider: PanoramaProvider = { checkAvailability, showPosition };
  usePanoramaEmitter(provider);

  return <div ref={containerRef} className="ngw-panorama-provider-container" />;
}
