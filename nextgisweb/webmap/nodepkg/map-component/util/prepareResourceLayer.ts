import { uniqueId } from "lodash-es";
import type { StyleLike } from "ol/style/Style";

import { routeURL } from "@nextgisweb/pyramid/api";
import type { Style } from "@nextgisweb/sld/type/api";
import type {
  GeoJsonLayerDefinition,
  GeoTIFFLayerOptions,
  LayerDefinition,
  TileLayerDefinition,
} from "@nextgisweb/webmap/layer-adapter";
import { DEFAULT_MAP_PROJECTION } from "@nextgisweb/webmap/map-adapter/constant";
import { renderTileUrl } from "@nextgisweb/webmap/utils/renderRequest";

export type ResourceLayerType = "geojson" | "geotiff" | "XYZ" | "MVT" | "image";

interface ResourceLayerOptions {
  resourceId: number;
  style?: StyleLike;
  raster?: GeoTIFFLayerOptions["raster"];
}

const defaultStyle: Style = {
  rules: [
    {
      symbolizers: [
        {
          type: "point",
          graphic: {
            size: 10,
            mark: {
              well_known_name: "circle",
              stroke: { color: "#3399CC", width: 1.25 },
              fill: { color: "#FFFFFF", opacity: 0.4 },
            },
          },
        },
        { type: "line", stroke: { color: "#3399CC", width: 1.25 } },
        {
          type: "polygon",
          stroke: { color: "#3399CC", width: 1.25 },
          fill: { color: "#FFFFFF", opacity: 0.4 },
        },
      ],
    },
  ],
};

export function prepareResourceLayer(
  type: ResourceLayerType,
  { resourceId, style, raster }: ResourceLayerOptions
): LayerDefinition {
  const name = uniqueId("resource_");
  const geojson = (): GeoJsonLayerDefinition => ({
    type: "geojson",
    options: {
      name,
      source: { url: routeURL("feature_layer.geojson", resourceId) },
      featureProjection: DEFAULT_MAP_PROJECTION,
      style: style ?? defaultStyle,
    },
  });
  const tile = (): TileLayerDefinition => ({
    type: "tile",
    options: {
      name,
      source: { url: renderTileUrl(resourceId, { nd: 204 }) },
      request: { noDataStatuses: [204] },
    },
  });

  const layerHandlers: Record<ResourceLayerType, () => LayerDefinition> = {
    geojson,
    MVT: () => ({
      type: "mvt",
      options: {
        name,
        source: {
          url:
            routeURL("feature_layer.mvt") +
            `?resource=${resourceId}&x={x}&y={y}&z={z}&nd=204`,
        },
        style,
      },
      fallback: geojson(),
    }),
    XYZ: tile,
    image: () => ({
      type: "image",
      options: {
        name,
        source: {
          url:
            routeURL("render.image") +
            `?resource=${resourceId}&extent={bbox}&size={width},{height}&nd=204`,
        },
      },
      fallback: tile(),
    }),
    geotiff: () => ({
      type: "geotiff",
      options: {
        name,
        source: { url: routeURL("raster_layer.cog", resourceId) },
        raster,
      },
    }),
  };

  return layerHandlers[type]();
}
