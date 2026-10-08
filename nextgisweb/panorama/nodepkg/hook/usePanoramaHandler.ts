import { WindowMessenger, connect } from "penpal";
import type { Connection } from "penpal";
import { useCallback, useEffect, useRef } from "react";

import type {
  AvailabilityStatus,
  PanoramaMessageEmitter,
  PanoramaMessageHandler,
} from "../type";

interface UsePanoramaHandlerOptions {
  onPositionChanged?: (lat: number, lng: number) => void;
  onPovChanged?: (heading: number, pitch: number) => void;
  onUnavailable?: () => void;
}

export function usePanoramaHandler(options: UsePanoramaHandlerOptions) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const emitterRef = useRef<PanoramaMessageEmitter | null>(null);
  const connectionPromiseRef = useRef<Promise<PanoramaMessageEmitter> | null>(
    null
  );
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const pendingPositionRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;

    const contentWindow = iframeRef.current.contentWindow;
    let connection: Connection<PanoramaMessageEmitter> | null = null;

    const timer = setTimeout(() => {
      const messenger = new WindowMessenger({
        remoteWindow: contentWindow,
        allowedOrigins: [window.location.origin],
      });

      const handler: PanoramaMessageHandler = {
        onPositionChanged(lat, lng) {
          optionsRef.current.onPositionChanged?.(lat, lng);
        },
        onPovChanged(heading, pitch) {
          optionsRef.current.onPovChanged?.(heading, pitch);
        },
        onUnavailable() {
          optionsRef.current.onUnavailable?.();
        },
      };

      connection = connect<PanoramaMessageEmitter>({
        messenger,
        methods: handler,
      });
      connectionPromiseRef.current = connection.promise;
      connection.promise
        .then((emitter) => {
          emitterRef.current = emitter;

          const pending = pendingPositionRef.current;
          if (pending) {
            emitter.setPosition(...pending);
          }
        })
        .catch(() => {
          //
        });
    }, 0);

    return () => {
      clearTimeout(timer);
      connection?.destroy();
    };
  }, []);

  const setPosition = useCallback((lat: number, lng: number) => {
    pendingPositionRef.current = [lat, lng];
    emitterRef.current?.setPosition(lat, lng);
  }, []);

  const checkAvailability = useCallback(
    async (lat: number, lng: number): Promise<AvailabilityStatus> => {
      try {
        const promise = connectionPromiseRef.current;
        if (!promise) return "error";
        const emitter = await promise;
        return await emitter.checkAvailability(lat, lng);
      } catch {
        return "error";
      }
    },
    []
  );

  return { iframeRef, setPosition, checkAvailability };
}
