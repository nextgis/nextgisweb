import { uniqueId } from "lodash-es";
import { MVT } from "ol/format";
import GeoJSON from "ol/format/GeoJSON";
import type { Layer } from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
import type { Source } from "ol/source";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile";

import { routeURL } from "@nextgisweb/pyramid/api";
import {
  createGeoTIFFLayer,
  createGeoTIFFPaletteStyle,
  setGeoTIFFBandStyle,
  setGeoTIFFRGBIntensityStyle,
} from "@nextgisweb/webmap/geotiff-adapter/createGeoTIFFLayer";
import { createImageLayer } from "@nextgisweb/webmap/image-adapter/createImageLayer";
import type {
  LayerAdapters,
  ResourceLayerAdapter,
} from "@nextgisweb/webmap/layer-adapter";
import { createTileLayer } from "@nextgisweb/webmap/tile-adapter/createTileLayer";

import { OlLayerAdapter } from "./layer/OlLayerAdapter";

function createNativeLayerAdapter<TSource extends Source>(
  layer: Layer<TSource>
): OlLayerAdapter<TSource> & ResourceLayerAdapter {
  return new (class extends OlLayerAdapter<TSource> {
    protected createSource(): TSource {
      return layer.getSource()!;
    }

    protected createLayer(): Layer<TSource> {
      return layer;
    }
  })(uniqueId("resource_"));
}

export const resourceLayerAdapters: NonNullable<
  LayerAdapters<OlLayerAdapter>["resource"]
> = {
  geojson: ({ resourceId, style }) =>
    createNativeLayerAdapter(
      new VectorLayer({
        source: new VectorSource({
          url: routeURL("feature_layer.geojson", resourceId),
          format: new GeoJSON(),
        }),
        style,
      })
    ),
  MVT: ({ resourceId, style }) =>
    createNativeLayerAdapter(
      new VectorTileLayer({
        source: new VectorTileSource({
          format: new MVT(),
          url:
            routeURL("feature_layer.mvt") +
            `?resource=${resourceId}&x={x}&y={y}&z={z}&nd=204`,
        }),
        style,
      })
    ),
  XYZ: ({ resourceId }) => createTileLayer({ styleId: resourceId }),
  image: ({ resourceId }) => createImageLayer({ styleId: resourceId }),
  geotiff: ({ resourceId, raster }) => {
    if (!raster) return;
    const { dtype, bands } = raster ?? {};
    const layer = createGeoTIFFLayer({ styleId: resourceId, dtype, bands });
    const adapter = createNativeLayerAdapter(layer);
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
  },
};
