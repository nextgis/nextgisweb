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

export interface GeoTIFFRGBIntensity {
  red: number;
  green: number;
  blue: number;
}
const DEFAULT_RGB_INTENSITY: GeoTIFFRGBIntensity = {
  red: 255,
  green: 255,
  blue: 255,
};

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

function getBandIndex(bands: RasterBand[] | undefined, color_interp: string) {
  return bands?.findIndex((b) => b.color_interp === color_interp) ?? -1;
}

function getDataBands(bands: RasterBand[]) {
  return bands
    .map((band, index) => ({ band, index }))
    .filter(({ band }) => band.color_interp !== "Alpha");
}

export function createGeoTIFFRGBStyle(
  rgbIdx: {
    red: number;
    green: number;
    blue: number;
  },
  alphaIdx = -1,
  intensity: GeoTIFFRGBIntensity = DEFAULT_RGB_INTENSITY
) {
  const channel = (idx: number, value: number) => [
    "clamp",
    ["*", ["/", ["band", idx + 1], 255], ["/", value, 255]],
    0,
    1,
  ];

  return {
    color: [
      "array",
      channel(rgbIdx.red, intensity.red),
      channel(rgbIdx.green, intensity.green),
      channel(rgbIdx.blue, intensity.blue),
      alphaIdx >= 0 ? ["/", ["band", alphaIdx + 1], 255] : 1,
    ],
  };
}

export function createGeoTIFFSingleBandStyle(
  bands: RasterBand[],
  selectedBand = 0
) {
  const alphaIdx = getBandIndex(bands, "Alpha");
  const selectedDataBand = getDataBands(bands)[selectedBand];

  if (!selectedDataBand) return undefined;

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

  return {
    color: ["array", normalized, normalized, normalized, alpha],
  };
}

export function setGeoTIFFBandStyle(
  layer: WebGLTileLayer,
  bands: RasterBand[],
  selectedBand = 0
) {
  const style = createGeoTIFFSingleBandStyle(bands, selectedBand);
  if (style) {
    layer.setStyle(style);
  }
}

export function setGeoTIFFRGBIntensityStyle(
  layer: WebGLTileLayer,
  bands: RasterBand[],
  intensity: GeoTIFFRGBIntensity
) {
  const redIdx = getBandIndex(bands, "Red");
  const greenIdx = getBandIndex(bands, "Green");
  const blueIdx = getBandIndex(bands, "Blue");
  const alphaIdx = getBandIndex(bands, "Alpha");

  if (redIdx < 0 || greenIdx < 0 || blueIdx < 0) return;

  layer.setStyle(
    createGeoTIFFRGBStyle(
      {
        red: redIdx,
        green: greenIdx,
        blue: blueIdx,
      },
      alphaIdx,
      intensity
    )
  );
}

export function createGeoTIFFLayer(
  item: CreateGeoTIFFLayerOptions,
  options?: CreateDisplayAdapterLayerOptions
) {
  const url = routeURL("raster_layer.cog", item.styleId);

  const redIdx = getBandIndex(item.bands, "Red");
  const greenIdx = getBandIndex(item.bands, "Green");
  const blueIdx = getBandIndex(item.bands, "Blue");
  const alphaIdx = getBandIndex(item.bands, "Alpha");

  const hasRGB = redIdx >= 0 && greenIdx >= 0 && blueIdx >= 0;

  if (hasRGB) {
    return new WebGLTileLayer({
      ...getLayerOptions(item),
      zIndex: 10,
      source: createSource(
        {
          sources: [{ url }],
          normalize: false,
        },
        options
      ),
      style: createGeoTIFFRGBStyle(
        {
          red: redIdx,
          green: greenIdx,
          blue: blueIdx,
        },
        alphaIdx
      ),
    });
  }

  const isNormalizable = item.dtype !== "Byte";

  if (isNormalizable && item.bands) {
    const style = createGeoTIFFSingleBandStyle(item.bands, item.selectedBand);

    if (style) {
      return new WebGLTileLayer({
        ...getLayerOptions(item),
        source: createSource(
          {
            sources: [{ url }],
            normalize: false,
          },
          options
        ),
        style,
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
