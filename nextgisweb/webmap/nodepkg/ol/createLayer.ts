import { MVT } from "ol/format";
import type { Layer } from "ol/layer";
import VectorTileLayer from "ol/layer/VectorTile";
import type { Source } from "ol/source";
import VectorTileSource from "ol/source/VectorTile";

import {
  createGeoTIFFLayerFromSource,
  createGeoTIFFPaletteStyle,
  setGeoTIFFBandStyle,
  setGeoTIFFRGBIntensityStyle,
} from "@nextgisweb/webmap/geotiff-adapter/createGeoTIFFLayer";
import type {
  GeoTIFFLayerOptions,
  MvtLayerOptions,
  RasterLayerAdapter,
} from "@nextgisweb/webmap/layer-adapter";
import type { LayerProperties } from "@nextgisweb/webmap/layer-adapter/CoreLayer";
import { isSldStyle } from "@nextgisweb/webmap/layer-adapter/isSldStyle";

import { OlLayerAdapter } from "./layer/OlLayerAdapter";
import { createSldStyle } from "./layer/sldStyle";

export function createNativeLayerAdapter<TSource extends Source>(
  layer: Layer<TSource>,
  options: Partial<LayerProperties> & { name: string }
): OlLayerAdapter<TSource> & RasterLayerAdapter {
  const adapter = new (class extends OlLayerAdapter<TSource> {
    protected createSource(): TSource {
      return layer.getSource()!;
    }

    protected createLayer(): Layer<TSource> {
      return layer;
    }
  })(options.name, {
    title: options.title,
    isTopLayer: options.isTopLayer,
  });
  if (options.isBaseLayer) adapter.isBaseLayer = true;
  return adapter;
}

export function createMvtLayer(options: MvtLayerOptions) {
  const { style } = options;
  return createNativeLayerAdapter(
    new VectorTileLayer({
      source: new VectorTileSource({
        format: new MVT(),
        url: options.source.url,
      }),
      style: style && isSldStyle(style) ? createSldStyle(style) : style,
    }),
    options
  );
}

export function createGeoTIFFLayerAdapter(options: GeoTIFFLayerOptions) {
  if (!options.raster) return;
  const { dtype, bands } = options.raster;
  const layer = createGeoTIFFLayerFromSource(options.source.url, {
    dtype,
    bands,
  });
  const adapter = createNativeLayerAdapter(layer, options);
  adapter.setRasterStyle = (style) => {
    if (style.mode === "rgb") {
      setGeoTIFFRGBIntensityStyle(layer, bands ?? [], style);
    } else if (style.mode === "band") {
      setGeoTIFFBandStyle(layer, bands ?? [], style.band, style.alpha);
    } else {
      const paletteStyle = createGeoTIFFPaletteStyle(
        bands ?? [],
        true,
        style.alpha
      );
      if (paletteStyle) layer.setStyle(paletteStyle);
    }
  };
  return adapter;
}
