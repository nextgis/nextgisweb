import type { FeatureLayerWebMapPluginConfig } from "@nextgisweb/webmap/plugin/type";
import type { TreeStore } from "@nextgisweb/webmap/store";

export const getSearchableLayers = (treeStore: TreeStore) =>
  treeStore
    .filter({ type: "layer" })
    .filter(
      (item) =>
        (
          item.plugin["@nextgisweb/webmap/plugin/feature-layer"] as
            | FeatureLayerWebMapPluginConfig
            | undefined
        )?.likeSearch
    );
