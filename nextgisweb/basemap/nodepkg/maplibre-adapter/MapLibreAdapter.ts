import Source from "ol/source/Source";
import type { Options as SourceOptions } from "ol/source/Source";

import { OlLayerAdapter } from "@nextgisweb/webmap/ol/layer/OlLayerAdapter";
import type { LayerOptions } from "@nextgisweb/webmap/ol/layer/OlLayerAdapter";

import { MapLibreStyleLayer } from "./MapLibreStyleLayer";

interface MapLibreSourceOptions extends SourceOptions {
  url: string;
}

export default class MapLibreAdapter extends OlLayerAdapter<
  Source,
  MapLibreStyleLayer,
  MapLibreSourceOptions
> {
  protected createSource({ url, ...options }: MapLibreSourceOptions) {
    const source = new Source(options);
    source.set("styleUrl", url);
    return source;
  }

  protected createLayer(options: LayerOptions & { source: Source }) {
    return new MapLibreStyleLayer({
      ...options,
      style: options.source.get("styleUrl"),
    });
  }
}
