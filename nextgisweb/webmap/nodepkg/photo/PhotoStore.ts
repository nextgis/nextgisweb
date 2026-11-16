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
      ({ resourceId, featureId }: { resourceId: number; featureId: number }) =>
        this.getLayer(resourceId).updateFeature(featureId)
    );
    topic.subscribe("/webmap/feature-table/refresh", (resourceId: number) =>
      this.getLayer(resourceId).load()
    );
  }

  @action
  getLayer(layerId: number): PhotoLayerStore {
    const store = this.layerStores.get(layerId);
    if (store) return store;

    const newStore = new PhotoLayerStore({ layerId });
    this.layerStores.set(layerId, newStore);
    return newStore;
  }
}
