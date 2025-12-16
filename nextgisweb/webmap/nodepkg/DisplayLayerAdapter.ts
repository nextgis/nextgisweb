import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { CoreLayer } from "./ol/layer/CoreLayer";

export type LayerDisplayAdapterCtor = new () => LayerDisplayAdapter;

export interface CreateDisplayAdapterLayerOptions {
    hmux?: boolean;
}
export abstract class LayerDisplayAdapter {
    abstract createLayer(
        _item: LayerItemConfig,
        _options?: CreateDisplayAdapterLayerOptions
    ): CoreLayer;
}
