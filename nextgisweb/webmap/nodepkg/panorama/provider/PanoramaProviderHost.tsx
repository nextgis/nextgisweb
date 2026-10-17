import { Suspense, useCallback, useRef, useState } from "react";

import { configuredProviders as providers } from "../client-settings";
import { usePanoramaHost } from "../hook/usePanoramaHost";
import type {
  AvailabilityStatus,
  PanoramaPosition,
  PanoramaProviderIdentity,
} from "../type";

export const PANORAMA_SEARCH_RADIUS = 50;

export default function PanoramaProviderHost() {
  const [identity, setIdentity] = useState<PanoramaProviderIdentity | null>(
    null
  );
  const [position, setPosition] = useState<PanoramaPosition | null>(null);

  const pendingRef = useRef<((status: AvailabilityStatus) => void)[]>([]);

  const { onPositionChanged, onPovChanged } = usePanoramaHost({
    setPosition: (lat, lng) =>
      new Promise((resolve) => {
        pendingRef.current.push(resolve);
        setPosition({ lat, lng });
      }),
    setProvider: async (next) => {
      if (!providers.some((p) => p.identity === next)) return;
      setIdentity(next);
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

  const onStatusChanged = useCallback((status: AvailabilityStatus) => {
    const pending = pendingRef.current;
    pendingRef.current = [];
    pending.forEach((resolve) => resolve(status));
  }, []);

  const current = providers.find((p) => p.identity === identity);
  if (!current || !position) return null;

  const Provider = current.component;

  return (
    <Suspense>
      <Provider
        key={current.identity}
        apiKey={current.apiKey}
        title={current.title}
        position={position}
        onStatusChanged={onStatusChanged}
        onPositionChanged={onPositionChanged}
        onPovChanged={onPovChanged}
      />
    </Suspense>
  );
}
