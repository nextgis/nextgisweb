import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { LayerDisplayAdapter } from "../DisplayLayerAdapter";
import type { CreateDisplayAdapterLayerOptions } from "../DisplayLayerAdapter";

import { createTileLayer } from "./createTileLayer";

export default class TileAdapter extends LayerDisplayAdapter {
    createLayer(
        item: LayerItemConfig,
        options?: CreateDisplayAdapterLayerOptions
    ) {
        return createTileLayer(item, options);
    }
}
