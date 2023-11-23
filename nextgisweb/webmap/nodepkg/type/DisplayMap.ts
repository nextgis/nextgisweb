import type Feature from "ol/Feature";
import type Map from "ol/Map";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/FeatureExtent";

import type { WebmapLayer } from "./WebmapLayer";

interface Position {
    zoom: number;
    center: number[];
}

export interface DisplayMap extends dojo.Stateful {
    readonly DPI: number;
    readonly IPM: number;
    readonly SMART_ZOOM_EXTENT: number;
    readonly SMART_ZOOM: number;

    readonly olMap: Map;
    readonly layers: Record<string, WebmapLayer>;

    addLayer(layer: WebmapLayer): void;
    removeLayer(layer: WebmapLayer): void;
    getScaleForResolution(res: number, mpu: number): number;
    getResolutionForScale(scale: number, mpu: number): number;
    getPosition(crs?: string): Position;
    getExtent(crs?: string): number[];
    zoomToFeature(feature: Feature): void;
    zoomToExtent(extent: number[]): void;
    zoomToNgwExtent(ngwExtent: NgwExtent, displayProjection?: string): void;
}
