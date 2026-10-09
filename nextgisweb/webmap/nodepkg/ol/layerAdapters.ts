import type { LayerDisplayAdapterCtor } from "../DisplayLayerAdapter";
import { entrypointsLoader } from "../compat/util/entrypointLoader";
import type { LayerAdapters } from "../layer-adapter";

import { resourceLayerAdapters } from "./createResourceLayer";
import { createURLLayer } from "./createURLLayer";
import { OlGeoJsonLayerAdapter } from "./layer/OlGeoJsonLayerAdapter";
import type { OlLayerAdapter } from "./layer/OlLayerAdapter";

export const layerAdapters: LayerAdapters<OlLayerAdapter> = {
  resource: resourceLayerAdapters,
  tile: createURLLayer,
  webmap: async (item, options) => {
    const { adapter } = item;
    const Adapter = (await entrypointsLoader([adapter]))[
      adapter
    ] as LayerDisplayAdapterCtor;
    return new Adapter().createLayer(item, options);
  },
  geojson: (options) => new OlGeoJsonLayerAdapter(options),
};
