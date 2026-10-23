import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { hasOlMap } from "./hasOlMap";

export function getOlMapProps({ map }: { map: MapStore }) {
  const { adapter } = map;
  return hasOlMap(adapter) ? { olMap: adapter.map } : undefined;
}
