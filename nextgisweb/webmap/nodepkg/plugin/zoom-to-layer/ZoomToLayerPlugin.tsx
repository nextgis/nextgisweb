import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

import { PluginBase } from "../PluginBase";
import type { PluginRunOptions } from "../PluginBase";

import Icon from "@nextgisweb/icon/material/zoom_in_map";

export class ZoomToLayerPlugin extends PluginBase {
  async run(
    nodeData: TreeLayerStore,
    options: PluginRunOptions
  ): Promise<undefined> {
    this.zoomToLayer(nodeData, options);
    return;
  }

  getMenuItem(nodeData: TreeLayerStore, options: PluginRunOptions) {
    return {
      icon: <Icon />,
      title: gettext("Zoom to layer"),
      order: -10,
      onClick: () => {
        this.run(nodeData, options);
      },
    };
  }

  private async zoomToLayer(
    item: TreeLayerStore,
    { signal }: PluginRunOptions
  ): Promise<void> {
    if (item && item.isLayer()) {
      try {
        const { extent } = await route("layer.extent", {
          id: item.styleId,
        }).get({ cache: true, signal });

        this.display.map.zoomToNgwExtent(extent, {
          displayProjection: this.display.displayProjection,
        });
      } catch (err) {
        errorModal(err);
      }
    }
  }
}
