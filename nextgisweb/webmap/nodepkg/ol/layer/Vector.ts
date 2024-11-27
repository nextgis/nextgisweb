import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";

import { BaseLayer } from "./_Base";
import type { LayerOptions, SourceOptions } from "./_Base";

export class Vector extends BaseLayer {
    protected createSource(options: SourceOptions): VectorSource {
        return new VectorSource(options);
    }

    protected createLayer(
        options: LayerOptions & { source: VectorSource }
    ): VectorLayer<VectorSource> {
        return new VectorLayer(options);
    }
}
