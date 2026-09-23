import type { FeatureCollection } from "geojson";

import { request } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/webmap/client-settings";

import type { SearchFunction, SearchResult } from "../type";

import { toResultGroup } from "./toResultGroup";

interface NominatimQuery {
  format?: "geojson";
  limit?: string;
  q?: string;
  polygon_geojson?: number;
  bounded?: string;
  viewbox?: string;
  countrycodes?: string;
}

export const searchByNominatim: SearchFunction = async (
  criteria,
  limit,
  display,
  controller,
  geoJSON
) => {
  const searchResults: SearchResult[] = [];
  if (
    !settings.address_search_enabled ||
    settings.address_geocoder !== "nominatim"
  ) {
    return [limit, [], false];
  }

  const query: NominatimQuery = {
    format: "geojson",
    limit: "30",
    q: criteria,
    polygon_geojson: 1,
  };

  if (settings.address_search_extent) {
    const extent = display.config.initialExtent;
    query.bounded = "1";
    query.viewbox = extent.join(",");
  }

  if (settings.nominatim_countrycodes) {
    query.countrycodes = settings.nominatim_countrycodes;
  }

  const searchUrl = `${settings.nominatimUrl}/search`;
  const headers = { "X-Requested-With": "null" };
  const global = true;
  const signal = controller.makeSignal();
  const geojson = (await request(searchUrl, {
    query,
    headers,
    signal,
    global,
  })) as FeatureCollection;
  const features = geojson.features;
  let isExceeded = false;
  features.forEach((f) => {
    if (isExceeded) return;
    const searchResult: SearchResult = {
      label: f.properties?.display_name,
      geometry: geoJSON.readGeometry(f.geometry, {
        featureProjection: display.displayProjection,
      }),
      key: limit,
    };
    searchResults.push(searchResult);
    limit = limit - 1;
    isExceeded = limit < 1;
  });

  const groups = toResultGroup("public", gettext("Places"), searchResults);

  return [limit, groups, isExceeded];
};
