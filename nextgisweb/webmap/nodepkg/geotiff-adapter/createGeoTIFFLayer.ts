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
  alpha?: number;
}

const DEFAULT_RGB_INTENSITY: GeoTIFFRGBIntensity = {
  red: 255,
  green: 255,
  blue: 255,
  alpha: 100,
};

function createAlphaExpression(
  alphaIdx: number,
  alpha = 100,
  fallbackAlpha: number | unknown[] = 1
) {
  if (alphaIdx < 0) {
    return fallbackAlpha;
  }

  return [
    "clamp",
    ["*", ["/", ["band", alphaIdx + 1], 255], ["/", alpha, 100]],
    0,
    1,
  ];
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

function getBandIndex(bands: RasterBand[] | undefined, color_interp: string) {
  return bands?.findIndex((b) => b.color_interp === color_interp) ?? -1;
}

function getDataBands(bands: RasterBand[]) {
  return bands
    .map((band, index) => ({ band, index }))
    .filter(
      ({ band }) =>
        band.color_interp !== "Alpha" && band.color_interp !== "Palette"
    );
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
      createAlphaExpression(alphaIdx, intensity.alpha ?? 100),
    ],
  };
}

export function createGeoTIFFSingleBandStyle(
  bands: RasterBand[],
  selectedBand = 0,
  alpha = 100
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

  const fallbackAlpha =
    nodata !== undefined
      ? ["case", ["==", ["band", olDataIdx], nodata], 0, 1]
      : 1;

  const alphaOpacity = createAlphaExpression(alphaIdx, alpha, fallbackAlpha);

  return {
    color: ["array", normalized, normalized, normalized, alphaOpacity],
  };
}

export function createGeoTIFFPaletteStyle(
  bands: RasterBand[],
  invert = true,
  alpha = 100
) {
  const paletteIdx = getBandIndex(bands, "Palette");
  const alphaIdx = getBandIndex(bands, "Alpha");

  if (paletteIdx < 0) return undefined;

  const dataBand = bands[paletteIdx];

  const min = dataBand.min ?? 0;
  const max = dataBand.max ?? 255;
  const olDataIdx = paletteIdx + 1;
  const range = max - min || 1;

  const normalized = [
    "clamp",
    ["/", ["-", ["band", olDataIdx], min], range],
    0,
    1,
  ];

  const value = invert ? ["-", 1, normalized] : normalized;

  const alphaValue =
    alphaIdx >= 0
      ? ["*", ["/", ["band", alphaIdx + 1], 255], ["/", alpha, 100]]
      : 1;

  return {
    color: ["array", value, value, value, alphaValue],
  };
}

export function setGeoTIFFBandStyle(
  layer: WebGLTileLayer,
  bands: RasterBand[],
  selectedBand = 0,
  alpha = 100
) {
  const style = createGeoTIFFSingleBandStyle(bands, selectedBand, alpha);

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

  const paletteStyle = item.bands
    ? createGeoTIFFPaletteStyle(item.bands, true)
    : undefined;

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

  if (paletteStyle) {
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
      style: paletteStyle,
    });
  }

  const singleBandStyle =
    item.bands && item.dtype !== "Byte"
      ? createGeoTIFFSingleBandStyle(item.bands, item.selectedBand)
      : undefined;

  if (singleBandStyle) {
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
      style: singleBandStyle,
    });
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
