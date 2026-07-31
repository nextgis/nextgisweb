import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
  TreeGroupStore,
  TreeLayerStore,
} from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";
import type { PluginRunOptions } from "../PluginBase";

import Icon from "@nextgisweb/icon/material/zoom_in_map";

const zoomToLayerPlugin = "@nextgisweb/webmap/plugin/zoom-to-layer";

export class ZoomToGroupPlugin extends PluginBase<TreeGroupStore> {
  type = "group" as const;

  getPluginState(nodeData: TreeGroupStore): PluginState<TreeGroupStore> {
    const state = super.getPluginState(nodeData);
    state.enabled = state.enabled && this.getLayers(nodeData).length > 0;
    return state;
  }

  async run(
    nodeData: TreeGroupStore,
    { signal }: PluginRunOptions
  ): Promise<undefined> {
    try {
      const extents = await Promise.all(
        [...new Set(this.getLayers(nodeData).map((item) => item.styleId))].map(
          async (styleId) => {
            const { extent } = await route("layer.extent", {
              id: styleId,
            }).get({ cache: true, signal });
            return extent;
          }
        )
      );

      const [firstExtent, ...restExtents] = extents;
      if (!firstExtent) return;

      const extent = restExtents.reduce(
        (result, current) => ({
          minLon: Math.min(result.minLon, current.minLon),
          minLat: Math.min(result.minLat, current.minLat),
          maxLon: Math.max(result.maxLon, current.maxLon),
          maxLat: Math.max(result.maxLat, current.maxLat),
        }),
        firstExtent
      );

      this.display.map.zoomToNgwExtent(extent, {
        displayProjection: this.display.displayProjection,
      });
    } catch (err) {
      errorModal(err);
    }
  }

  getMenuItem(nodeData: TreeGroupStore, options: PluginRunOptions) {
    return {
      icon: <Icon />,
      title: gettext("Zoom to group"),
      onClick: () => {
        this.run(nodeData, options);
      },
    };
  }

  private getLayers(group: TreeGroupStore): TreeLayerStore[] {
    return this.display.treeStore
      .getDescendants(group.id)
      .filter(
        (item): item is TreeLayerStore =>
          item.isLayer() && zoomToLayerPlugin in item.plugin
      );
  }
}
