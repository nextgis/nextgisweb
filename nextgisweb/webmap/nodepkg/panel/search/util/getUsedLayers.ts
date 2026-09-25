import type { Display } from "@nextgisweb/webmap/display";

import type { SearchSettings } from "../type";

import { getSearchableLayers } from "./getSearchableLayers";

export const getUsedLayers = (
  display: Display,
  mode: SearchSettings["usedLayers"]
) => {
  const layers = getSearchableLayers(display);
  if (mode === "visible") return layers.filter((layer) => layer.visible);
  if (typeof mode === "number") {
    return layers.filter((layer) => layer.layerId === mode);
  }
  return layers;
};
