import WebGLTileLayer from "ol/layer/WebGLTile";
import type { Options as WebGLTileLayerOptions } from "ol/layer/WebGLTile";
import GeoTIFFSource from "ol/source/GeoTIFF";
import type { Options as GeoTIFFSourceOptions } from "ol/source/GeoTIFF";

import { routeURL } from "@nextgisweb/pyramid/api";
import { geoTIFFLoadFunction } from "@nextgisweb/pyramid/util";
import type { RasterBand } from "@nextgisweb/raster-layer/type/api";

import type { CreateDisplayAdapterLayerOptions } from "../DisplayLayerAdapter";
import type { CreateLayerOptions } from "../type/CreateLayerOptions";

interface CreateGeoTIFFLayerOptions extends CreateLayerOptions {
  dtype?: string;
  bands?: RasterBand[];
  selectedBand?: number;
}

function createSource(
  sourceOptions: GeoTIFFSourceOptions,
  options?: CreateDisplayAdapterLayerOptions
) {
  return new GeoTIFFSource({
    ...sourceOptions,
    sources: sourceOptions.sources.map((source) => {
      return {
        ...source,
        loader: (src, headers, signal) =>
          geoTIFFLoadFunction({
            src,
            hmux: options?.hmux,
            signal,
            headers,
          }),
      };
    }),
  });
}

function getLayerOptions(
  item: CreateGeoTIFFLayerOptions
): WebGLTileLayerOptions {
  return {
    visible: item.visibility,
    maxResolution: item.maxResolution ?? undefined,
    minResolution: item.minResolution ?? undefined,
    opacity: item.transparency ? 1 - item.transparency / 100 : 1.0,
  };
}

export function createGeoTIFFLayer(
  item: CreateGeoTIFFLayerOptions,
  options?: CreateDisplayAdapterLayerOptions
) {
  const url = routeURL("raster_layer.cog", item.styleId);
  const isNormalizable = item.dtype !== "Byte";

  if (isNormalizable && item.bands) {
    const alphaIdx = item.bands.findIndex((b) => b.color_interp === "Alpha");
    const dataBands = item.bands
      .map((band, index) => ({ band, index }))
      .filter(({ band }) => band.color_interp !== "Alpha");

    const selectedDataBand =
      item.selectedBand !== undefined
        ? dataBands[item.selectedBand]
        : dataBands[0];

    if (selectedDataBand) {
      const { band: dataBand, index: dataIdx } = selectedDataBand;
      const min = dataBand.min ?? 0;
      const max = dataBand.max ?? 1;
      const olDataIdx = dataIdx + 1; // OL band indices are 1-based
      const range = max - min || 1;

      const normalized = [
        "clamp",
        ["/", ["-", ["band", olDataIdx], min], range],
        0,
        1,
      ];
      const nodata =
        typeof dataBand.no_data === "number" ? dataBand.no_data : undefined;
      const alpha =
        alphaIdx >= 0
          ? ["/", ["band", alphaIdx + 1], 255]
          : nodata !== undefined
            ? ["case", ["==", ["band", olDataIdx], nodata], 0, 1]
            : 1;

      return new WebGLTileLayer({
        ...getLayerOptions(item),
        source: createSource(
          {
            sources: [{ url, nodata }],
            normalize: false,
          },
          options
        ),
        style: {
          color: ["array", normalized, normalized, normalized, alpha],
        },
      });
    }
  }

  return new WebGLTileLayer({
    ...getLayerOptions(item),
    zIndex: 10,
    source: createSource(
      {
        sources: [{ url }],
        convertToRGB: true,
      },
      options
    ),
  });
}
