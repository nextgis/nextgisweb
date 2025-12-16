import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { LayerDisplayAdapter } from "../DisplayLayerAdapter";
import type { CreateDisplayAdapterLayerOptions } from "../DisplayLayerAdapter";

import { createImageLayer } from "./createImageLayer";

export class ImageAdapter extends LayerDisplayAdapter {
    createLayer(
        item: LayerItemConfig,
        options?: CreateDisplayAdapterLayerOptions
    ) {
        return createImageLayer(item, options);
    }
}
