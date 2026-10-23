import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { LayerDisplayAdapter } from "../DisplayLayerAdapter";
import type { WebmapLayerOptions } from "../layer-adapter";

import { createImageLayer } from "./createImageLayer";

export class ImageAdapter extends LayerDisplayAdapter {
  createLayer(item: LayerItemConfig, options?: WebmapLayerOptions) {
    return createImageLayer(item, options);
  }
}
