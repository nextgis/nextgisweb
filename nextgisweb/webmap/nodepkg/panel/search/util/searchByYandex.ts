import { request } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/webmap/client-settings";

import type { SearchFunction, SearchResult } from "../type";

import { toResultGroup } from "./toResultGroup";

interface YandexGeoObject {
  name: string;
  Point: {
    pos: string;
  };
}

interface YandexFeatureMember {
  GeoObject?: YandexGeoObject;
}

interface YandexResponse {
  response?: {
    GeoObjectCollection?: {
      featureMember?: YandexFeatureMember[];
    };
  };
}

interface YandexGeocoderQuery {
  apikey?: string | null;
  geocode?: string;
  format?: "json";
  bbox?: string;
}

export const searchByYandex: SearchFunction = async (
  criteria,
  limit,
  display,
  controller,
  geoJSON
) => {
  const searchResults: SearchResult[] = [];
  if (
    !settings.address_search_enabled ||
    settings.address_geocoder !== "yandex"
  ) {
    return [limit, [], false];
  }

  const apikey = settings.yandex_api_geocoder_key;
  const query: YandexGeocoderQuery = {
    apikey,
    geocode: criteria,
    format: "json",
  };

  if (settings.address_search_extent && display.config.initialExtent) {
    const extent = display.config.initialExtent;
    query.bbox = `${extent[0]},${extent[1]}~${extent[2]},${extent[3]}`;
  }

  const YANDEX_SEARCH_URL = "https://geocode-maps.yandex.ru/1.x/";
  const global = true;
  const signal = controller.makeSignal();
  const yaGeocoderResponse = await request<YandexResponse>(YANDEX_SEARCH_URL, {
    query,
    global,
    signal,
  });
  let featureMembers: YandexFeatureMember[] = [];
  if (
    yaGeocoderResponse &&
    yaGeocoderResponse.response &&
    yaGeocoderResponse.response.GeoObjectCollection &&
    yaGeocoderResponse.response.GeoObjectCollection.featureMember
  ) {
    featureMembers =
      yaGeocoderResponse.response.GeoObjectCollection.featureMember;
  }

  let isExceeded = false;
  featureMembers.forEach((featureMember) => {
    if (isExceeded || !featureMember.GeoObject) return;
    const geoObject = featureMember.GeoObject;
    const [lon, lat] = featureMember.GeoObject.Point.pos.split(" ");
    const searchResult: SearchResult = {
      label: geoObject.name,
      geometry: geoJSON.readGeometry(
        {
          "type": "Point",
          "coordinates": [lon, lat],
        },
        {
          featureProjection: display.displayProjection,
        }
      ),
      key: limit,
    };
    searchResults.push(searchResult);
    limit = limit - 1;
    isExceeded = limit < 1;
  });

  const groups = toResultGroup("public", gettext("Places"), searchResults);

  return [limit, groups, isExceeded];
};
