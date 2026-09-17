import type GeoJSON from "ol/format/GeoJSON";
import type { Geometry } from "ol/geom";

import type { AbortControllerHelper } from "@nextgisweb/pyramid/util";
import type { Display } from "@nextgisweb/webmap/display";

export interface SearchResult {
  label: string;
  geometry: Geometry;
  type: "place" | "layers" | "public";
  key: number;
  identifiable: boolean;
  resourceId?: number;
  featureId?: number;
}

type SearchStepResult = [number, SearchResult[], boolean];
export type SearchFunction = (
  criteria: string,
  limit: number,
  display: Display,
  controller: AbortControllerHelper,
  geoJSON: GeoJSON
) => Promise<SearchStepResult>;
