import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { LayerDisplayAdapter } from "../DisplayLayerAdapter";
import type { WebmapLayerOptions } from "../layer-adapter";

import { createTileLayer } from "./createTileLayer";

export default class TileAdapter extends LayerDisplayAdapter {
  createLayer(item: LayerItemConfig, options?: WebmapLayerOptions) {
    return createTileLayer(item, options);
  }
}
