import type { Coordinate } from "ol/coordinate";
import { LineString, Point, Polygon } from "ol/geom";

import type { AnnotationFeature } from "../AnnotationFeature";

export function getPopupCoordinates(annFeature: AnnotationFeature): Coordinate {
    const geometry = annFeature.getFeature()?.getGeometry();
    if (!geometry) {
        throw Error(`No geometry found`);
    }

    if (geometry instanceof Point) {
        return geometry.getCoordinates();
    }

    if (geometry instanceof LineString) {
        const coordinates = geometry.getCoordinates();
        const midIndex = Math.floor(coordinates.length / 2);
        return coordinates[midIndex];
    }

    if (geometry instanceof Polygon) {
        return geometry.getInteriorPoint().getCoordinates();
    }

    throw Error(`Unknown geometry type: ${geometry.getType()}`);
}
