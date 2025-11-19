import { clamp } from "lodash-es";
import type { Extent } from "ol/extent";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import type { ExtentWSEN } from "@nextgisweb/webmap/type/api";

export function convertNgwExtentToWSEN(extent: NgwExtent): ExtentWSEN {
    return [extent.minLon, extent.minLat, extent.maxLon, extent.maxLat];
}

export function convertWSENToNgwExtent(extent: ExtentWSEN): NgwExtent {
    return {
        minLon: extent[0],
        minLat: extent[1],
        maxLon: extent[2],
        maxLat: extent[3],
    };
}

export function clampExtent(extent: Extent, bounds: Extent): Extent {
    return [
        clamp(extent[0], bounds[0], bounds[2]),
        clamp(extent[1], bounds[1], bounds[3]),
        clamp(extent[2], bounds[0], bounds[2]),
        clamp(extent[3], bounds[1], bounds[3]),
    ];
}
