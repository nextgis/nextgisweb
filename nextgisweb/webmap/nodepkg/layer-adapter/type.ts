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

export type ResourceLayerType = "geojson" | "geotiff" | "XYZ" | "MVT" | "image";

export interface ResourceLayerOptions {
  resourceId: number;
  style?: StyleLike;
  raster?: {
    dtype?: string;
    bands?: RasterBand[];
  };
}

export type ResourceRasterStyle =
  | {
      mode: "rgb";
      red: number;
      green: number;
      blue: number;
      alpha?: number;
    }
  | { mode: "band"; band: number; alpha: number }
  | { mode: "palette"; alpha: number };

export interface ResourceLayerAdapter extends CoreLayer {
  setRasterStyle?(style: ResourceRasterStyle): void;
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

export interface ResourceLayerDefinition {
  type: "resource";
  resourceType: ResourceLayerType;
  options: ResourceLayerOptions;
}

export type LayerDefinition =
  | TileLayerDefinition
  | WebmapLayerDefinition
  | GeoJsonLayerDefinition
  | ResourceLayerDefinition;

type LayerAdapterMap = {
  tile: CoreLayer;
  webmap: WebmapLayerAdapter;
  geojson: GeoJsonLayerAdapter;
  resource: ResourceLayerAdapter;
};

export type LayerAdapterFor<T extends LayerDefinition | undefined> =
  T extends LayerDefinition ? LayerAdapterMap[T["type"]] : never;

export interface LayerSupport {
  tile?: (options: TileLayerOptions) => boolean;
  webmap?: (item: LayerItemConfig, options?: WebmapLayerOptions) => boolean;
  geojson?: (options: GeoJsonLayerOptions) => boolean;
  resource?: Partial<
    Record<ResourceLayerType, (options: ResourceLayerOptions) => boolean>
  >;
}

export interface LayerAdapters<TLayer extends CoreLayer = CoreLayer> {
  resource?: Partial<
    Record<
      ResourceLayerType,
      (
        options: ResourceLayerOptions
      ) =>
        | (TLayer & ResourceLayerAdapter)
        | undefined
        | Promise<(TLayer & ResourceLayerAdapter) | undefined>
    >
  >;
  tile: (
    options: TileLayerOptions
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
  ) => (TLayer & GeoJsonLayerAdapter) | Promise<TLayer & GeoJsonLayerAdapter>;
}
