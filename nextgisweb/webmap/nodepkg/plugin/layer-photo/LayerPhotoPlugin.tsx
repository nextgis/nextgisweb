import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import PhotoIcon from "@nextgisweb/icon/material/photo";

const webmapPhotoTabLazy = lazy(
  () => import("@nextgisweb/webmap/webmap-photo-tab")
);

export class LayerPhotoPlugin extends PluginBase {
  private openPhotoPanel(item: TreeLayerStore) {
    if (!item.isLayer()) return;
    this.display.tabsManager.addTab({
      key: `${item.styleId}:ph`,
      label: `${gettext("Photos of")} ${item.label}`,
      component: webmapPhotoTabLazy,
    });
  }
  getMenuItem(nodeData: TreeLayerStore): PluginMenuItem {
    return {
      icon: <PhotoIcon />,
      title: gettext("Watch photos"),
      order: 130,
      onClick: () => {
        this.openPhotoPanel(nodeData);
        return Promise.resolve(undefined);
      },
    };
  }
}
