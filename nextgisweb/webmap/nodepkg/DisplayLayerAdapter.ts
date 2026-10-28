import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { WebmapLayerOptions } from "./layer-adapter";
import type { OlLayerAdapter } from "./ol/layer/OlLayerAdapter";

export type LayerDisplayAdapterCtor = new () => LayerDisplayAdapter;

export abstract class LayerDisplayAdapter {
  abstract createLayer(
    _item: LayerItemConfig,
    _options?: WebmapLayerOptions
  ): OlLayerAdapter;
}
