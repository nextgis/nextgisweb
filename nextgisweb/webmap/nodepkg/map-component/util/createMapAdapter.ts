import View from "ol/View";
import type { ViewOptions } from "ol/View";

import type { MapViewOptions } from "@nextgisweb/webmap/map-adapter";
import { DEFAULT_MAP_PROJECTION } from "@nextgisweb/webmap/map-adapter/constant";
import { MapStore } from "@nextgisweb/webmap/ol/MapStore";

export function createMapAdapter({
  target,
  initialView,
  viewOptions = { projection: DEFAULT_MAP_PROJECTION },
}: {
  target?: HTMLElement;
  initialView?: MapViewOptions;
  viewOptions?: ViewOptions;
} = {}) {
  const view = new View(viewOptions);

  const adapter = new MapStore({
    view,
    target,
    controls: [],
    initialView,
  });

  return adapter;
}
