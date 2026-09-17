import { lonLatToDM } from "@nextgisweb/webmap/coordinates/formatter";
import { parse } from "@nextgisweb/webmap/coordinates/parser";

import type { SearchFunction, SearchResult } from "../type";

export const parseCoordinatesInput: SearchFunction = async (
  criteria,
  limit,
  display,
  _,
  geoJSON
) => {
  const coordinates = parse(criteria);
  const searchResults: SearchResult[] = [];
  const featureProjection = display.displayProjection;
  coordinates.forEach((c) => {
    const { lat, lon } = c;
    const searchResult: SearchResult = {
      label: lonLatToDM([lon, lat]),
      geometry: geoJSON.readGeometry(
        {
          "type": "Point",
          "coordinates": [lon, lat],
        },
        { featureProjection }
      ),
      type: "place",
      key: limit,
      identifiable: false,
    };
    searchResults.push(searchResult);
    limit = limit - 1;
  });
  return [limit, searchResults, false];
};
