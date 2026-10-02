import { LayerDisplayAdapter } from "@nextgisweb/webmap/DisplayLayerAdapter";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { createPointCloudLayer } from "./createPointCloudLayer";
import type { PointCloudLayerOptions } from "./type";

export class PointCloudAdapter extends LayerDisplayAdapter {
  createLayer(item: LayerItemConfig, options?: PointCloudLayerOptions) {
    return createPointCloudLayer(item, options);
  }
}
