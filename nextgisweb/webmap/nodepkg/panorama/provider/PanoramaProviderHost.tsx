import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { configuredProviders as providers } from "../client-settings";
import { usePanoramaHost } from "../hook/usePanoramaHost";
import type {
  AvailabilityStatus,
  PanoramaPosition,
  PanoramaPov,
} from "../type";

interface PanoramaState {
  provider: (typeof providers)[number];
  position: PanoramaPosition;
  pov: PanoramaPov;
  resolve: (status: AvailabilityStatus) => void;
}

export default function PanoramaProviderHost() {
  const [panorama, setPanorama] = useState<PanoramaState | null>(null);
  const pendingRef = useRef<PanoramaState | null>(null);

  const { onPositionChanged, onPovChanged } = usePanoramaHost({
    show: (identity, position, pov) => {
      pendingRef.current?.resolve("error");
      pendingRef.current = null;
      const provider = providers.find((p) => p.identity === identity);
      if (!provider) {
        setPanorama(null);
        return Promise.resolve("error");
      }

      return new Promise<AvailabilityStatus>((resolve) => {
        const next = { provider, position, pov, resolve };
        pendingRef.current = next;
        setPanorama(next);
      });
    },
    checkAvailability: async (providerIdentity, lat, lng) => {
      const provider = providers.find((p) => p.identity === providerIdentity);
      if (!provider) return { status: "error" };
      try {
        return await provider.checkAvailability(provider.apiKey, lat, lng);
      } catch {
        return { status: "error" };
      }
    },
  });

  const onStatusChanged = useCallback(
    (status: AvailabilityStatus) => {
      if (panorama && pendingRef.current === panorama) {
        pendingRef.current = null;
        panorama.resolve(status);
      }
    },
    [panorama]
  );

  useEffect(() => {
    return () => {
      pendingRef.current?.resolve("error");
      pendingRef.current = null;
    };
  }, []);

  if (!panorama) return null;
  const { provider: current, position, pov } = panorama;
  const Provider = current.component;

  return (
    <Suspense>
      <Provider
        key={current.identity}
        apiKey={current.apiKey}
        title={current.title}
        position={position}
        pov={pov}
        onStatusChanged={onStatusChanged}
        onPositionChanged={onPositionChanged}
        onPovChanged={onPovChanged}
      />
    </Suspense>
  );
}
