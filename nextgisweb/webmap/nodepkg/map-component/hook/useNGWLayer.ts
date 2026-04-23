import { MVT } from "ol/format";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
import WebGLTileLayer from "ol/layer/WebGLTile";
import GeoTIFFSource from "ol/source/GeoTIFF";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile";
import type { StyleLike } from "ol/style/Style";
import { useEffect, useMemo, useState } from "react";

import { route, routeURL } from "@nextgisweb/pyramid/api";
import { createImageLayer as createNGWImageLayer } from "@nextgisweb/webmap/image-adapter/createImageLayer";
import { createTileLayer } from "@nextgisweb/webmap/tile-adapter/createTileLayer";

interface RasterBand {
  color_interp: string;
  min: number | null;
  max: number | null;
}

export type LayerType = "geojson" | "geotiff" | "XYZ" | "MVT" | "image";

export interface LayerOptions {
  style?: StyleLike;
}

const createGeoJsonLayer = (
  resourceId: number,
  layerOptions?: LayerOptions
) => {
  const url = routeURL("feature_layer.geojson", resourceId);
  const layer = new VectorLayer({
    source: new VectorSource({ url: url, format: new GeoJSON() }),
    ...layerOptions,
  });
  return layer;
};

const FLOAT_DTYPES = ["Float32", "Float64"];

const createGeoTIFFLayer = (
  resourceId: number,
  dtype?: string,
  bands?: RasterBand[]
) => {
  const url = routeURL("raster_layer.cog", resourceId);
  const isFloat = dtype !== undefined && FLOAT_DTYPES.includes(dtype);

  if (isFloat && bands) {
    const alphaIdx = bands.findIndex((b) => b.color_interp === "Alpha");
    const dataIdx = bands.findIndex((b) => b.color_interp !== "Alpha");
    if (dataIdx >= 0) {
      const dataBand = bands[dataIdx];
      const min = dataBand.min ?? 0;
      const max = dataBand.max ?? 1;
      const olDataIdx = dataIdx + 1; // OL band indices are 1-based
      const range = max - min || 1;

      const normalized: any = [
        "clamp",
        ["/", ["-", ["band", olDataIdx], min], range],
        0,
        1,
      ];
      const alpha = alphaIdx >= 0 ? ["/", ["band", alphaIdx + 1], 255] : 1;
      return new WebGLTileLayer({
        source: new GeoTIFFSource({ sources: [{ url }], normalize: false }),
        style: { color: ["array", normalized, normalized, normalized, alpha] },
      });
    }
  }

  return new WebGLTileLayer({
    source: new GeoTIFFSource({ sources: [{ url }], convertToRGB: true }),
  });
};

const createXYZLayer = (resourceId: number) => {
  const layer = createTileLayer({ styleId: resourceId });
  return layer.olLayer;
};

const createImageLayer = (resourceId: number) => {
  const layer = createNGWImageLayer({ styleId: resourceId });
  return layer.olLayer;
};

const createMVTLayer = (resourceId: number, layerOptions?: LayerOptions) => {
  const url =
    routeURL("feature_layer.mvt") +
    `?resource=${resourceId}&x={x}&y={y}&z={z}&nd=204`;
  const source = new VectorTileSource({
    format: new MVT(),
    url,
  });
  return new VectorTileLayer({
    source,
    ...layerOptions,
  });
};

export function useNGWLayer({
  layerType,
  resourceId,
  layerOptions,
}: {
  layerType: LayerType;
  resourceId: number;
  layerOptions?: LayerOptions;
}) {
  const [geotiffLayer, setGeotiffLayer] = useState<WebGLTileLayer | null>(null);

  useEffect(() => {
    if (layerType !== "geotiff") return;
    let cancelled = false;
    route("resource.item", resourceId)
      .get()
      .then((data) => {
        if (cancelled) return;
        const dtype = data.raster_layer?.dtype;
        const bands = data.raster_layer?.bands as unknown as
          | RasterBand[]
          | undefined;
        setGeotiffLayer(createGeoTIFFLayer(resourceId, dtype, bands));
      });
    return () => {
      cancelled = true;
    };
  }, [layerType, resourceId]);

  const syncLayer = useMemo(() => {
    if (layerType === "geotiff") return null;
    if (layerType === "geojson") {
      return createGeoJsonLayer(resourceId, layerOptions);
    } else if (layerType === "MVT") {
      return createMVTLayer(resourceId, layerOptions);
    } else if (layerType === "image") {
      return createImageLayer(resourceId);
    } else if (layerType === "XYZ") {
      return createXYZLayer(resourceId);
    } else {
      throw new Error(`Not supported layer type: ${layerType}`);
    }
  }, [layerOptions, layerType, resourceId]);

  return layerType === "geotiff" ? geotiffLayer : syncLayer;
}
