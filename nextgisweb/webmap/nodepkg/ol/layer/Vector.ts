import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import type { Options as VectorSourceOptions } from "ol/source/Vector";

import { OlLayerAdapter } from "./OlLayerAdapter";
import type { LayerOptions } from "./OlLayerAdapter";

export default class Vector extends OlLayerAdapter<
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
