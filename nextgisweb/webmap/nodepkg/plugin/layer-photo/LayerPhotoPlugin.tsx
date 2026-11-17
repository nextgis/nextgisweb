import { lazy } from "react";

import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import { PhotoStore } from "@nextgisweb/webmap/photo/PhotoStore";
import type {
  TreeItemStore,
  TreeLayerStore,
} from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type {
  PluginMenuItem,
  PluginParams,
  PluginState,
} from "@nextgisweb/webmap/type";
import type { WebMapPhotoTabProps } from "@nextgisweb/webmap/webmap-photo-tab/WebMapPhotoTab";

import { PluginBase } from "../PluginBase";

import PhotoIcon from "@nextgisweb/icon/material/photo";

const webmapPhotoTabLazy = lazy(
  () => import("@nextgisweb/webmap/webmap-photo-tab")
);

const msgPhotosOf = gettextf("Photos of {}");

interface LayerPhotoPluginConfig {
  has_photos: boolean;
}

export class LayerPhotoPlugin extends PluginBase {
  photoStore = new PhotoStore();

  constructor(params: PluginParams) {
    super(params);
    topic.subscribe(
      "feature.updated",
      ({ resourceId, featureId }: { resourceId: number; featureId: number }) =>
        this.findLayerStore(resourceId)?.updateFeature(featureId)
    );
    topic.subscribe("/webmap/feature-table/refresh", (resourceId: number) =>
      this.findLayerStore(resourceId)?.load()
    );
  }

  getPluginState(nodeData: TreeLayerStore): PluginState<TreeLayerStore> {
    const base = super.getPluginState(nodeData);
    if (!base.enabled) return base;
    const { hasPhotos } = this.getLayerStore(nodeData.layerId, nodeData);
    return { ...base, enabled: !!hasPhotos };
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

  private getLayerStore(layerId: number, item: TreeItemStore) {
    const config: LayerPhotoPluginConfig = item.plugin[this.identity];
    return this.photoStore.getLayer({ layerId, hasPhotos: config.has_photos });
  }

  private findLayerStore(layerId: number) {
    const item = this.display.treeStore
      .filter({ type: "layer", layerId })
      .find((i) => i.plugin[this.identity]);
    return item ? this.getLayerStore(layerId, item) : undefined;
  }

  private openPhotoPanel(item: TreeLayerStore) {
    if (!item.isLayer()) return;
    const store = this.getLayerStore(item.layerId, item);
    this.display.tabsManager.addTab<WebMapPhotoTabProps>({
      key: `${item.layerId}:ph`,
      label: msgPhotosOf(item.label),
      component: webmapPhotoTabLazy,
      props: { store },
    });
  }
}
