import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import type { Options as VectorSourceOptions } from "ol/source/Vector";

import { BaseLayer } from "./_Base";
import type { LayerOptions } from "./_Base";

export default class Vector extends BaseLayer<
    VectorSource,
    VectorLayer<VectorSource>,
    VectorSourceOptions
> {
    protected createSource(options: VectorSourceOptions): VectorSource {
        return new VectorSource(options);
    }

    protected createLayer(
        options: LayerOptions & { source: VectorSource }
    ): VectorLayer<VectorSource> {
        return new VectorLayer(options);
    }
}
