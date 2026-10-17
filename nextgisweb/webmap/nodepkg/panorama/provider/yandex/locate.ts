import type ymaps from "yandex-maps";

import { findNearest } from "./findNearest";
import { loadYandexMaps } from "./loadYandexMaps";

export type LocateResult =
  | { status: "available"; panorama: ymaps.IPanorama }
  | { status: "unavailable" | "error" };

export async function locate(
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
