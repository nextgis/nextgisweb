export interface NgwExtent {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
}

export interface FeatureExtent {
    extent: NgwExtent;
}
