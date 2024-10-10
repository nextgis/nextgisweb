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
