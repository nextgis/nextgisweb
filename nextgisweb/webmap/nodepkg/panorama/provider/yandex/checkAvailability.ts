import type { AvailabilityResult } from "../../type";

import { locate } from "./locate";

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
