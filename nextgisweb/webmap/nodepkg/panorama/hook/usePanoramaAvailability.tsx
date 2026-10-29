import { useCallback } from "react";

import { routeURL } from "@nextgisweb/pyramid/api";

import type { AvailabilityResult, PanoramaProviderIdentity } from "../type";

import { usePanoramaHandler } from "./usePanoramaHandler";

export function usePanoramaAvailability(
  provider: PanoramaProviderIdentity | null | undefined
) {
  const { iframeRef, checkAvailability } = usePanoramaHandler({});
  const check = useCallback(
    async (lat: number, lng: number): Promise<AvailabilityResult> => {
      if (!provider) return { status: "error" };
      return checkAvailability(provider, lat, lng);
    },
    [provider, checkAvailability]
  );

  const element = (
    <iframe
      ref={iframeRef}
      src={routeURL("webmap.panorama")}
      aria-hidden
      tabIndex={-1}
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        border: "none",
        visibility: "hidden",
      }}
    />
  );

  return { element, check };
}
