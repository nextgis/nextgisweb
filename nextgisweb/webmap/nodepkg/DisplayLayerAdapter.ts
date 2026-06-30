import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { MapStore } from "./ol/MapStore";
import type { CoreLayer } from "./ol/layer/CoreLayer";

export type LayerDisplayAdapterCtor = new () => LayerDisplayAdapter;

export interface CreateDisplayAdapterLayerOptions {
  hmux?: boolean;
  mapProjection?: string;
  mapStore?: MapStore;
}
export abstract class LayerDisplayAdapter {
  abstract createLayer(
    _item: LayerItemConfig,
    _options?: CreateDisplayAdapterLayerOptions
  ): CoreLayer;
}
