import { useEffect } from "react";

import type { PhotoLayerStore, PhotoTransform } from "../PhotoLayerStore";

export function usePhotoTransform(
  store: PhotoLayerStore,
  key: string,
  transform: PhotoTransform | undefined
) {
  useEffect(() => {
    if (!transform) return;
    store.setTransform(key, transform);
    return () => store.setTransform(key, undefined);
  }, [store, key, transform]);
}
