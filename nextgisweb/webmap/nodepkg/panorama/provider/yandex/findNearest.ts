import type ymaps from "yandex-maps";

import { PANORAMA_SEARCH_RADIUS } from "../PanoramaProviderHost";

export async function findNearest(
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
