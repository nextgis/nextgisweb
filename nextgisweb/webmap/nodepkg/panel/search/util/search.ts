import GeoJSON from "ol/format/GeoJSON";

import type { AbortControllerHelper } from "@nextgisweb/pyramid/util";
import type { Display } from "@nextgisweb/webmap/display";

import type { SearchResultGroup } from "../type";

import { parseCoordinatesInput } from "./parseCoordinatesInput";
import { searchByLayers } from "./searchByLayers";
import { searchByNominatim } from "./searchByNominatim";
import { searchByYandex } from "./searchByYandex";

const GEO_JSON_FORMAT = new GeoJSON();

const searchSteps = [
  parseCoordinatesInput,
  searchByLayers,
  searchByNominatim,
  searchByYandex,
];

export const search = async (
  criteria: string,
  controller: AbortControllerHelper,
  display: Display
): Promise<[SearchResultGroup[], boolean] | undefined> => {
  let searchGroups: SearchResultGroup[] = [],
    isExceeded = false,
    limit = 100,
    groups: SearchResultGroup[];

  controller.makeSignal();

  for (const searchStep of searchSteps) {
    try {
      [limit, groups, isExceeded] = await searchStep(
        criteria,
        limit,
        display,
        controller,
        GEO_JSON_FORMAT
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
