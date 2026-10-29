import { WindowMessenger, connect } from "penpal";
import { useEffect } from "react";

import type { PanoramaMessageHandler, PanoramaProviderHost } from "../type";

let target: PanoramaProviderHost | null = null;
let remotePromise: Promise<PanoramaMessageHandler | null> | null = null;

const methods: PanoramaProviderHost = {
  setPosition: async (lat, lng) =>
    target ? target.setPosition(lat, lng) : "error",
  setProvider: async (identity) => {
    await target?.setProvider(identity);
  },
  checkAvailability: async (identity, lat, lng) =>
    target ? target.checkAvailability(identity, lat, lng) : { status: "error" },
};

function connectParent(): Promise<PanoramaMessageHandler | null> {
  remotePromise ??= connect<PanoramaMessageHandler>({
    messenger: new WindowMessenger({
      remoteWindow: window.parent,
      allowedOrigins: [window.location.origin],
    }),
    methods,
  }).promise.catch((err) => {
    console.error(err);
    return null;
  });
  return remotePromise;
}

const handler: PanoramaMessageHandler = {
  onPositionChanged: (lat, lng) => {
    connectParent().then((remote) => remote?.onPositionChanged(lat, lng));
  },
  onPovChanged: (heading, pitch) => {
    connectParent().then((remote) => remote?.onPovChanged(heading, pitch));
  },
};

export function usePanoramaHost(host: PanoramaProviderHost) {
  useEffect(() => {
    target = host;
    connectParent();
    return () => {
      if (target === host) target = null;
    };
  });

  return handler;
}
