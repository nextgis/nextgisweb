import type { Display } from "@nextgisweb/webmap/display";
import type { FeatureLayerWebMapPluginConfig } from "@nextgisweb/webmap/plugin/type";

export const getSearchableLayers = (display: Display) =>
  display.treeStore
    .filter({ type: "layer" })
    .filter(
      (item) =>
        (
          item.plugin["@nextgisweb/webmap/plugin/feature-layer"] as
            | FeatureLayerWebMapPluginConfig
            | undefined
        )?.likeSearch
    );
