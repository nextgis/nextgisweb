import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { LayerDisplayAdapter } from "../DisplayLayerAdapter";

import { createImageLayer } from "./createImageLayer";

export class ImageAdapter extends LayerDisplayAdapter {
    createLayer(item: LayerItemConfig) {
        return createImageLayer(item);
    }
}
