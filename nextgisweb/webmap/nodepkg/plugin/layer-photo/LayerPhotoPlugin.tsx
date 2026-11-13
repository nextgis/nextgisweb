import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
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

interface LayerPhotoPluginConfig {
  has_photos: boolean;
}

export class LayerPhotoPlugin extends PluginBase {
  private stores = new Map<number, PhotoLayerStore>();
  private checkCtrls = new Map<number, AbortController>();

  constructor(params: PluginParams) {
    super(params);
    topic.subscribe(
      "feature.updated",
      ({ resourceId }: { resourceId: number }) =>
        this.onLayerChanged(resourceId)
    );
    topic.subscribe("/webmap/feature-table/refresh", (layerId: number) =>
      this.onLayerChanged(layerId)
    );
  }

  getPluginState(nodeData: TreeLayerStore): PluginState<TreeLayerStore> {
    const base = super.getPluginState(nodeData);
    if (!base.enabled) return base;
    const store = this.stores.get(nodeData.layerId);
    const hasPhotos = store
      ? store.hasPhotos
      : this.getConfig(nodeData).has_photos;
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
    return nodeData.plugin[this.identity] as LayerPhotoPluginConfig;
  }

  private getStore(layerId: number, hasPhotos: boolean): PhotoLayerStore {
    let store = this.stores.get(layerId);
    if (!store) {
      store = new PhotoLayerStore(layerId, hasPhotos);
      this.stores.set(layerId, store);
    }
    return store;
  }

  private onLayerChanged(layerId: number) {
    const store = this.getStore(layerId, false);

    this.checkCtrls.get(layerId)?.abort();
    const ctrl = new AbortController();
    this.checkCtrls.set(layerId, ctrl);

    store.check(ctrl.signal).catch((err) => {
      console.error(err);
    });
  }

  private openPhotoPanel(item: TreeLayerStore) {
    if (!item.isLayer()) return;
    const store = this.getStore(item.layerId, this.getConfig(item).has_photos);
    this.display.tabsManager.addTab<WebMapPhotoTabProps>({
      key: `${item.styleId}:ph`,
      label: `${gettext("Photos of")} ${item.label}`,
      component: webmapPhotoTabLazy,
      props: { store },
    });
  }
}
