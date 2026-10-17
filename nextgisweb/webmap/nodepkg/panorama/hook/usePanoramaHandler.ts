import { WindowMessenger, connect } from "penpal";
import { useCallback, useEffect, useState } from "react";

import type {
  AvailabilityResult,
  AvailabilityStatus,
  PanoramaMessageHandler,
  PanoramaProviderHost,
  PanoramaProviderIdentity,
} from "../type";

interface IframeConnection {
  promise: Promise<PanoramaProviderHost | null>;
  destroy: () => void;
  handler: Partial<PanoramaMessageHandler> | null;
}

const connections = new WeakMap<HTMLIFrameElement, IframeConnection>();

function connectIframe(iframe: HTMLIFrameElement): IframeConnection | null {
  const existing = connections.get(iframe);
  if (existing) return existing;

  const remoteWindow = iframe.contentWindow;
  if (!remoteWindow) return null;

  const methods: PanoramaMessageHandler = {
    onPositionChanged: (lat, lng) => {
      connections.get(iframe)?.handler?.onPositionChanged?.(lat, lng);
    },
    onPovChanged: (heading, pitch) => {
      connections.get(iframe)?.handler?.onPovChanged?.(heading, pitch);
    },
  };

  const { promise, destroy } = connect<PanoramaProviderHost>({
    messenger: new WindowMessenger({
      remoteWindow,
      allowedOrigins: [window.location.origin],
    }),
    methods,
    timeout: 15000,
  });

  const current: IframeConnection = {
    promise: promise.catch((err) => {
      if (connections.get(iframe) === current) console.error(err);
      return null;
    }),
    destroy,
    handler: null,
  };
  connections.set(iframe, current);
  return current;
}

export function usePanoramaHandler(handler: Partial<PanoramaMessageHandler>) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!iframe) return;
    const connection = connectIframe(iframe);
    if (!connection) return;

    connection.handler = handler;
    return () => {
      if (connection.handler === handler) connection.handler = null;
      if (iframe.isConnected) return;
      connections.delete(iframe);
      connection.destroy();
    };
  });

  const getHost = useCallback(async () => {
    if (!iframe) return null;
    return (await connections.get(iframe)?.promise) ?? null;
  }, [iframe]);

  const setPosition = useCallback(
    async (lat: number, lng: number): Promise<AvailabilityStatus> => {
      const host = await getHost();
      if (!host) return "error";
      return host.setPosition(lat, lng).catch(() => "error" as const);
    },
    [getHost]
  );

  const setProvider = useCallback(
    async (identity: PanoramaProviderIdentity) => {
      const host = await getHost();
      await host?.setProvider(identity);
    },
    [getHost]
  );

  const checkAvailability = useCallback(
    async (
      identity: PanoramaProviderIdentity,
      lat: number,
      lng: number
    ): Promise<AvailabilityResult> => {
      const host = await getHost();
      if (!host) return { status: "error" };
      return host
        .checkAvailability(identity, lat, lng)
        .catch(() => ({ status: "error" }) as const);
    },
    [getHost]
  );

  return {
    iframeRef: setIframe,
    ready: iframe !== null,
    setPosition,
    setProvider,
    checkAvailability,
  };
}
