import GeoJSON from "ol/format/GeoJSON";

import { request } from "@nextgisweb/pyramid/api";

import { DEFAULT_MAP_PROJECTION } from "../map-adapter/constant";

import type { GeoJsonLayerOptions } from "./type";

export async function loadGeoJsonFeatures(options: GeoJsonLayerOptions) {
  const data = await request<object>(options.source!.url);
  return new GeoJSON().readFeatures(data, {
    featureProjection: options.featureProjection ?? DEFAULT_MAP_PROJECTION,
  });
}
