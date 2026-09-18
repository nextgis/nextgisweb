import type GeoJSON from "ol/format/GeoJSON";
import type { Geometry } from "ol/geom";

import type { AbortControllerHelper } from "@nextgisweb/pyramid/util";
import type { Display } from "@nextgisweb/webmap/display";

export type SearchResultGroup = {
  type: "layers" | "place" | "public";
  label: string;
  resourceId?: number;
  identifiable?: boolean;
  children: SearchResult[];
};

export interface SearchResult {
  label: string;
  geometry: Geometry;
  key: number;
  featureId?: number;
  searchContext?: number[];
}

type SearchStepResult = [number, SearchResultGroup[], boolean];
export type SearchFunction = (
  criteria: string,
  limit: number,
  display: Display,
  controller: AbortControllerHelper,
  geoJSON: GeoJSON
) => Promise<SearchStepResult>;
