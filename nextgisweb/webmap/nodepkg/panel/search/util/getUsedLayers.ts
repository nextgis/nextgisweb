import type { TreeStore } from "@nextgisweb/webmap/store";

import type { SearchSettings } from "../type";

import { getSearchableLayers } from "./getSearchableLayers";

export const getUsedLayers = (
  treeStore: TreeStore,
  mode: SearchSettings["usedLayers"]
) => {
  const layers = getSearchableLayers(treeStore);
  if (mode === "visible") return layers.filter((layer) => layer.visible);
  if (typeof mode === "number") {
    return layers.filter((layer) => layer.layerId === mode);
  }
  return layers;
};
