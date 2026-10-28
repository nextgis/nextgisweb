import type Instance from "@giro3d/giro3d/core/Instance";
import { CoordinateSystem } from "@giro3d/giro3d/core/geographic/CoordinateSystem";
import VectorSource from "@giro3d/giro3d/sources/VectorSource";
import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";

import type { Style } from "@nextgisweb/sld/type/api";
import type {
  GeoJsonLayerAdapter,
  GeoJsonLayerOptions,
} from "@nextgisweb/webmap/layer-adapter";
import { isSldStyle } from "@nextgisweb/webmap/layer-adapter/isSldStyle";
import { DEFAULT_MAP_PROJECTION } from "@nextgisweb/webmap/map-adapter/constant";
import { createSldStyle } from "@nextgisweb/webmap/ol/layer/sldStyle";

import { GiroLayerAdapter } from "./GiroLayerAdapter";

export class GiroGeoJsonLayerAdapter
  extends GiroLayerAdapter
  implements GeoJsonLayerAdapter
{
  private readonly source: VectorSource;

  constructor(
    instance: Instance,
    private readonly options: GeoJsonLayerOptions,
    onOrderChange: () => void
  ) {
    const source = new VectorSource({
      data: [],
      dataProjection: CoordinateSystem.get(
        options.featureProjection ?? DEFAULT_MAP_PROJECTION
      ),
      transparent: true,
    });
    super(instance, options, source, onOrderChange);
    this.source = source;
    if (options.style && isSldStyle(options.style)) {
      this.setStyle(options.style);
    }
  }

  setFeatures(features: Feature<Geometry>[]): void {
    if (this.disposed) return;
    this.source.clear();
    this.source.addFeatures(
      features.map((feature) => {
        const copy = feature.clone();
        copy.setId(feature.getId());
        return copy;
      })
    );
  }

  setStyle(style: Style): void {
    if (!this.disposed) {
      const sldStyle = createSldStyle(style, {
        target: this.options.target ?? false,
        dashPattern: true,
      });
      this.source.setStyle(sldStyle);
    }
  }
}
