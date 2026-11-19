import { useCallback, useState } from "react";

import type { Photo } from "@nextgisweb/webmap/photo/PhotoLayerStore";

import { getPhotoKey } from "../../photo/util/getPhotoKey";

export function usePhotoSelection(photos: Photo[] | undefined) {
  const [selectedKey, setSelectedKey] = useState<string>();

  const selectedPhoto = selectedKey
    ? photos?.find((p) => getPhotoKey(p) === selectedKey)
    : undefined;

  const select = useCallback((photo: Photo) => {
    const key = getPhotoKey(photo);
    setSelectedKey((prev) => (prev === key ? undefined : key));
  }, []);

  return {
    selectedKey,
    selectedPhoto,
    select,
  };
}
