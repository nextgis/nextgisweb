import { WindowMessenger, connect } from "penpal";
import type { Connection } from "penpal";
import { useEffect, useRef } from "react";

import type {
  PanoramaMessageEmitter,
  PanoramaMessageHandler,
  PanoramaProvider,
} from "../type";

export function usePanoramaEmitter(provider: PanoramaProvider) {
  const providerRef = useRef(provider);
  providerRef.current = provider;

  useEffect(() => {
    let connection: Connection<PanoramaMessageHandler> | null = null;
    let handler: PanoramaMessageHandler | null = null;

    const timer = setTimeout(() => {
      const messenger = new WindowMessenger({
        remoteWindow: window.parent,
        allowedOrigins: [window.location.origin],
      });

      const emitter: PanoramaMessageEmitter = {
        setPosition(lat, lng) {
          if (handler) providerRef.current.showPosition(lat, lng, handler);
        },
        checkAvailability(lat, lng) {
          return providerRef.current.checkAvailability(lat, lng);
        },
      };

      connection = connect<PanoramaMessageHandler>({
        messenger,
        methods: emitter,
      });
      connection.promise
        .then((resolved) => {
          handler = resolved;
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
}
