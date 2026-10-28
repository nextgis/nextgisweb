import type OlFeature from "ol/Feature";
import type { Geometry } from "ol/geom";
import type { StyleLike } from "ol/style/Style";

import type { FilterExpressionString } from "@nextgisweb/feature-layer/feature-filter/type";
import type { RasterBand } from "@nextgisweb/raster-layer/type/api";
import type { Style } from "@nextgisweb/sld/type/api";
import type { LayerSymbols } from "@nextgisweb/webmap/compat/type";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { CoreLayer, LayerProperties } from "./CoreLayer";

type LayerOptions = Partial<LayerProperties>;

export interface WebmapLayerAdapter extends CoreLayer {
  setFilter(filter: FilterExpressionString | null): void;
  setSymbols(symbols: LayerSymbols): void;
  setResolutionRange(
    minResolution: number | null,
    maxResolution: number | null
  ): void;
}

export interface GeoJsonLayerOptions extends LayerOptions {
  name: string;
  visible?: boolean;
  opacity?: number;
  featureProjection?: string;
  target?: boolean;
  source?: { url: string };
  style?: Style | StyleLike;
}

export interface GeoJsonLayerAdapter extends CoreLayer {
  setFeatures(features: OlFeature<Geometry>[]): void;
  setStyle(style: Style): void;
}

export interface WebmapLayerOptions {
  hmux?: boolean;
}

export interface TileLayerOptions extends LayerOptions {
  type?: "tms" | "vector_tiles";
  source: {
    url?: string;
    wrapX?: boolean;
    maxZoom?: number;
    minZoom?: number;
    projection?: string;
  };
  layer?: {
    visible?: boolean;
    opacity?: number;
    minZoom?: number;
  };
  request?: {
    cache?: RequestCache;
    noDataStatuses?: number[];
  };
  copyrightUrl?: string | null;
  copyrightText?: string | null;
}

export interface MvtLayerOptions extends LayerOptions {
  name: string;
  source: { url: string };
  style?: Style | StyleLike;
}

export interface ImageLayerOptions extends LayerOptions {
  name: string;
  source: { url: string; projection?: string };
}

export interface GeoTIFFLayerOptions extends LayerOptions {
  name: string;
  source: { url: string };
  raster?: {
    dtype?: string;
    bands?: RasterBand[];
  };
}

export type RasterStyle =
  | {
      mode: "rgb";
      red: number;
      green: number;
      blue: number;
      alpha?: number;
    }
  | { mode: "band"; band: number; alpha: number }
  | { mode: "palette"; alpha: number };

export interface RasterLayerAdapter extends CoreLayer {
  setRasterStyle?(style: RasterStyle): void;
}

export interface TileLayerDefinition {
  type: "tile";
  options: TileLayerOptions;
}

export interface WebmapLayerDefinition {
  type: "webmap";
  item: LayerItemConfig;
  options?: WebmapLayerOptions;
}

export interface GeoJsonLayerDefinition {
  type: "geojson";
  options: GeoJsonLayerOptions;
}

export interface MvtLayerDefinition {
  type: "mvt";
  options: MvtLayerOptions;
}

export interface ImageLayerDefinition {
  type: "image";
  options: ImageLayerOptions;
}

export interface GeoTIFFLayerDefinition {
  type: "geotiff";
  options: GeoTIFFLayerOptions;
}

export type LayerDefinition = (
  | TileLayerDefinition
  | WebmapLayerDefinition
  | GeoJsonLayerDefinition
  | MvtLayerDefinition
  | ImageLayerDefinition
  | GeoTIFFLayerDefinition
) & { fallback?: LayerDefinition };

type LayerAdapterMap = {
  mvt: CoreLayer;
  tile: CoreLayer;
  image: CoreLayer;
  webmap: WebmapLayerAdapter;
  geojson: GeoJsonLayerAdapter;
  geotiff: RasterLayerAdapter;
};

export type LayerAdapterFor<T extends LayerDefinition | undefined> =
  T extends LayerDefinition ? LayerAdapterMap[T["type"]] : never;

export interface LayerSupport {
  mvt?: (options: MvtLayerOptions) => boolean;
  tile?: (options: TileLayerOptions) => boolean;
  image?: (options: ImageLayerOptions) => boolean;
  webmap?: (item: LayerItemConfig, options?: WebmapLayerOptions) => boolean;
  geojson?: (options: GeoJsonLayerOptions) => boolean;
  geotiff?: (options: GeoTIFFLayerOptions) => boolean;
}

export interface LayerAdapters<TLayer extends CoreLayer = CoreLayer> {
  mvt?: (
    options: MvtLayerOptions
  ) => TLayer | undefined | Promise<TLayer | undefined>;

  tile: (
    options: TileLayerOptions
  ) => TLayer | undefined | Promise<TLayer | undefined>;
  image?: (
    options: ImageLayerOptions
  ) => TLayer | undefined | Promise<TLayer | undefined>;
  webmap: (
    item: LayerItemConfig,
    options?: WebmapLayerOptions
  ) =>
    | (TLayer & WebmapLayerAdapter)
    | undefined
    | Promise<(TLayer & WebmapLayerAdapter) | undefined>;
  geojson: (
    options: GeoJsonLayerOptions
  ) =>
    | (TLayer & GeoJsonLayerAdapter)
    | undefined
    | Promise<(TLayer & GeoJsonLayerAdapter) | undefined>;
  geotiff?: (
    options: GeoTIFFLayerOptions
  ) =>
    | (TLayer & RasterLayerAdapter)
    | undefined
    | Promise<(TLayer & RasterLayerAdapter) | undefined>;
}
