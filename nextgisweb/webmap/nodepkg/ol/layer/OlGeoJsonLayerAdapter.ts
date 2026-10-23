import type Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type { Geometry } from "ol/geom";

import type { Style as SldStyle } from "@nextgisweb/sld/type/api";
import { isSldStyle } from "@nextgisweb/webmap/layer-adapter/isSldStyle";
import type {
  GeoJsonLayerAdapter,
  GeoJsonLayerOptions,
} from "@nextgisweb/webmap/layer-adapter/type";

import Vector from "./Vector";
import { createSldStyle } from "./sldStyle";

export class OlGeoJsonLayerAdapter
  extends Vector
  implements GeoJsonLayerAdapter
{
  private disposed = false;
  private readonly target: boolean;

  constructor(options: GeoJsonLayerOptions) {
    super(
      options.name,
      {
        title: options.title,
        visible: options.visible,
        opacity: options.opacity,
        isTopLayer: options.isTopLayer,
      },
      options.source
        ? { url: options.source.url, format: new GeoJSON() }
        : undefined
    );
    if (options.isBaseLayer) this.isBaseLayer = true;
    this.target = options.target ?? false;
    if (options.style) {
      if (isSldStyle(options.style)) this.setStyle(options.style);
      else this.olLayer.setStyle(options.style);
    }
  }

  setFeatures(features: Feature<Geometry>[]): void {
    if (this.disposed) return;
    this.olSource.clear();
    this.olSource.addFeatures(features);
  }

  setStyle(style: SldStyle): void {
    if (this.disposed) return;
    this.olLayer.setStyle(createSldStyle(style, { target: this.target }));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.olSource.clear();
    super.dispose();
  }
}
