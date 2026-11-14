import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { PhotoStore } from "@nextgisweb/webmap/photo/PhotoStore";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem, PluginState } from "@nextgisweb/webmap/type";
import type { WebMapPhotoTabProps } from "@nextgisweb/webmap/webmap-photo-tab/WebMapPhotoTab";

import { PluginBase } from "../PluginBase";

import PhotoIcon from "@nextgisweb/icon/material/photo";

const webmapPhotoTabLazy = lazy(
  () => import("@nextgisweb/webmap/webmap-photo-tab")
);

interface LayerPhotoPluginConfig {
  has_photos: boolean;
}

export class LayerPhotoPlugin extends PluginBase {
  photoStore = new PhotoStore();

  getPluginState(nodeData: TreeLayerStore): PluginState<TreeLayerStore> {
    const base = super.getPluginState(nodeData);
    if (!base.enabled) return base;
    const hasPhotos =
      this.photoStore.layerStores.get(nodeData.layerId)?.layerHasPhotos ??
      this.getConfig(nodeData).has_photos;
    return { ...base, enabled: hasPhotos };
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

  private getConfig(nodeData: TreeLayerStore): LayerPhotoPluginConfig {
    return nodeData.plugin[this.identity];
  }

  private openPhotoPanel(item: TreeLayerStore) {
    if (!item.isLayer()) return;
    const store = this.photoStore.getLayer(
      item.layerId,
      this.getConfig(item).has_photos
    );
    this.display.tabsManager.addTab<WebMapPhotoTabProps>({
      key: `${item.layerId}:ph`,
      label: `${gettext("Photos of")} ${item.label}`,
      component: webmapPhotoTabLazy,
      props: { store },
    });
  }
}
