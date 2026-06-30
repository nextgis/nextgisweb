import { LayerDisplayAdapter } from "@nextgisweb/webmap/DisplayLayerAdapter";
import type { CreateDisplayAdapterLayerOptions } from "@nextgisweb/webmap/DisplayLayerAdapter";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { createPointCloudLayer } from "./createPointCloudLayer";

export class PointCloudAdapter extends LayerDisplayAdapter {
  createLayer(
    item: LayerItemConfig,
    options?: CreateDisplayAdapterLayerOptions
  ) {
    return createPointCloudLayer(item, options);
  }
}
