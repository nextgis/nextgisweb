import { PANORAMA_SEARCH_RADIUS } from "../PanoramaProviderHost";

import { loadService } from "./loadService";

export type LocateResult =
  | { status: "available"; latLng: google.maps.LatLng }
  | { status: "unavailable" | "error" };

export async function locate(
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
