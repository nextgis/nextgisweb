import { action, observable, observableRef } from "mobx";

import { PhotoLayerStore } from "./PhotoLayerStore";
import type { PhotoLayerStoreOptions } from "./PhotoLayerStore";

export class PhotoStore {
  @observableRef accessor layerStores = observable.map<
    number,
    PhotoLayerStore
  >();

  @action
  getLayer(options: PhotoLayerStoreOptions): PhotoLayerStore {
    const store = this.layerStores.get(options.layerId);
    if (store) return store;

    const newStore = new PhotoLayerStore(options);
    this.layerStores.set(options.layerId, newStore);
    return newStore;
  }
}
