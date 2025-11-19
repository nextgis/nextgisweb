import View from "ol/View";
import type { ViewOptions } from "ol/View";

import { MapStore } from "@nextgisweb/webmap/ol/MapStore";

export function createMapAdapter({
    target,
    viewOptions = { projection: `EPSG:3857` },
}: {
    target?: HTMLElement | string;
    viewOptions?: ViewOptions;
} = {}) {
    const view = new View(viewOptions);

    const adapter = new MapStore({
        view,
        target,
        controls: [],
    });

    return adapter;
}
