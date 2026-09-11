import Source from "ol/source/Source";
import type { Options as SourceOptions } from "ol/source/Source";

import { CoreLayer } from "@nextgisweb/webmap/ol/layer/CoreLayer";
import type { LayerOptions } from "@nextgisweb/webmap/ol/layer/CoreLayer";

import { MapLibreStyleLayer } from "./MapLibreStyleLayer";

interface MapLibreSourceOptions extends SourceOptions {
  url: string;
}

export default class MapLibreAdapter extends CoreLayer<
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
