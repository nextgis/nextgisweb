/** @import NgwExtent from "@nextgisweb/feature-layer/type/api" */
/** @deprecated Use @type {NgwExtent}} from "@nextgisweb/feature-layer/type/api" */
export interface NgwExtent {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
}

export interface FeatureExtent {
    extent: NgwExtent;
}
