import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { Display } from "./display";
import type { CoreLayer } from "./ol/layer/CoreLayer";

export interface LayerDisplayAdapterOptions {
    display: Display;
}

export type LayerDisplayAdapterCtor = new (
    options: LayerDisplayAdapterOptions
) => LayerDisplayAdapter;

export abstract class LayerDisplayAdapter {
    display: Display;

    constructor({ display }: LayerDisplayAdapterOptions) {
        this.display = display;
    }

    abstract createLayer(_item: LayerItemConfig): CoreLayer;
}
