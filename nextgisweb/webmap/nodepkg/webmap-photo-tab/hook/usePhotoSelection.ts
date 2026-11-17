import { useCallback, useState } from "react";

import type { Photo } from "@nextgisweb/webmap/photo/PhotoLayerStore";

import { getPhotoKey } from "../../photo/util/getPhotoKey";
import type { PhotoToolbarMode } from "../type";

export function usePhotoSelection(
  photos: Photo[] | undefined,
  onReset: () => void
) {
  const [mode, setMode] = useState<PhotoToolbarMode>("view");
  const [selectedKey, setSelectedKey] = useState<string>();
  const [previewKey, setPreviewKey] = useState<string>();

  const selected = selectedKey
    ? photos?.find((p) => getPhotoKey(p) === selectedKey)
    : undefined;

  const changeMode = useCallback(
    (value: PhotoToolbarMode) => {
      setMode(value);
      setSelectedKey(undefined);
      setPreviewKey(undefined);
      onReset();
    },
    [onReset]
  );

  const select = useCallback((photo: Photo) => {
    const key = getPhotoKey(photo);
    setSelectedKey((prev) => (prev === key ? undefined : key));
  }, []);

  const openSelected = () => {
    if (selected) setPreviewKey(getPhotoKey(selected));
  };

  return {
    mode,
    selectable: mode === "select",
    selected,
    selectedKey: selected ? selectedKey : undefined,
    previewKey,
    changeMode,
    select,
    setPreviewKey,
    openSelected,
  };
}
