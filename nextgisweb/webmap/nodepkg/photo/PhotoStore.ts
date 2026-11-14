import { action, observable, observableRef } from "mobx";

import topic from "@nextgisweb/webmap/compat/topic";

import { PhotoLayerStore } from "./PhotoLayerStore";

export class PhotoStore {
  @observableRef accessor layerStores = observable.map<
    number,
    PhotoLayerStore
  >();

  constructor() {
    topic.subscribe(
      "feature.updated",
      ({ resourceId }: { resourceId: number }) =>
        this.getLayer(resourceId).check()
    );
    topic.subscribe("/webmap/feature-table/refresh", (resourceId: number) =>
      this.getLayer(resourceId).check()
    );
  }

  @action
  getLayer(layerId: number, hasInitialPhotos = false): PhotoLayerStore {
    const store = this.layerStores.get(layerId);
    if (store) return store;

    const newStore = new PhotoLayerStore({ layerId, hasInitialPhotos });
    this.layerStores.set(layerId, newStore);
    return newStore;
  }
}
