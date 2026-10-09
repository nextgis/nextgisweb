import OlMap from "ol/Map";

import type { MapAdapter } from "../../map-adapter";

export function hasOlMap(
  adapter: MapAdapter
): adapter is MapAdapter & { readonly map: OlMap } {
  return "map" in adapter && adapter.map instanceof OlMap;
}
