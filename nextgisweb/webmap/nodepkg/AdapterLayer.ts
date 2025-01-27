import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { CoreLayer } from "./ol/layer/_Base";

export interface AdapterOptions {
    [key: string]: any;
}

// export interface AdapterLayerItemConfig {
//     id: string;
//     styleId: string;
//     maxResolution?: number;
//     minResolution?: number;
//     visibility: boolean;
//     transparency?: number;

// }

export class AdapterLayer {
    constructor(options: AdapterOptions = {}) {
        Object.assign(this, options);
    }

    createLayer(_item: LayerItemConfig): CoreLayer {
        throw new Error("AdaperLayer is an abstract class");
    }
}
