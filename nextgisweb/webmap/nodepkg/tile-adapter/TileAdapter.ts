import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { LayerDisplayAdapter } from "../DisplayLayerAdapter";

import { createTileLayer } from "./createTileLayer";

export default class TileAdapter extends LayerDisplayAdapter {
    createLayer(item: LayerItemConfig) {
        return createTileLayer(item);
    }
}
