import GeoJSON from "ol/format/GeoJSON";

import type { AbortControllerHelper } from "@nextgisweb/pyramid/util";
import type { Display } from "@nextgisweb/webmap/display";

import type {
  SearchFunction,
  SearchResultGroup,
  SearchSettings,
} from "../type";

import { parseCoordinatesInput } from "./parseCoordinatesInput";
import { searchByLayers } from "./searchByLayers";
import { searchByNominatim } from "./searchByNominatim";
import { searchByYandex } from "./searchByYandex";

const GEO_JSON_FORMAT = new GeoJSON();

const getSearchSteps = (settings: SearchSettings): SearchFunction[] => {
  const steps: SearchFunction[] = [];
  if (settings.sources.coordinates) steps.push(parseCoordinatesInput);
  steps.push(searchByLayers);
  if (settings.sources.geocoder) steps.push(searchByNominatim, searchByYandex);
  return steps;
};

export const search = async (
  criteria: string,
  controller: AbortControllerHelper,
  display: Display,
  settings: SearchSettings
): Promise<[SearchResultGroup[], boolean] | undefined> => {
  let searchGroups: SearchResultGroup[] = [],
    isExceeded = false,
    limit = 100,
    groups: SearchResultGroup[];

  controller.makeSignal();

  for (const searchStep of getSearchSteps(settings)) {
    try {
      [limit, groups, isExceeded] = await searchStep(
        criteria,
        limit,
        display,
        controller,
        GEO_JSON_FORMAT,
        settings
      );
      searchGroups = searchGroups.concat(groups);
    } catch (err) {
      console.error(err);
    }
    if (controller.empty) {
      return undefined;
    }
    if (isExceeded) return [searchGroups, isExceeded];
  }
  return [searchGroups, isExceeded];
};
