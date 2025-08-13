import type Feature from "ol/Feature";
import { WKT } from "ol/format";
import {
    GeometryCollection,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
} from "ol/geom";
import type { Geometry, LineString, Point, Polygon } from "ol/geom";

import type { FeaureLayerGeometryType } from "@nextgisweb/feature-layer/type/api";
import { getOlLayout } from "@nextgisweb/webmap/utils/geometry-types";

export function featuresToWkt(
    features: Feature<Geometry>[],
    type: FeaureLayerGeometryType,
    multiGeometry?: boolean
): string | null {
    const wkt = new WKT();
    if (features.length === 0) {
        return null;
    }
    const olGeoms = features.map((f) => f.getGeometry()!);
    const layout = getOlLayout(type);

    let outGeom: Geometry;
    if (!multiGeometry) {
        outGeom = olGeoms[0];
    } else if (type.includes("POINT")) {
        outGeom = new MultiPoint(
            olGeoms.map((g) => (g as Point).getCoordinates()),
            layout
        );
    } else if (type.includes("LINESTRING")) {
        outGeom = new MultiLineString(
            olGeoms.map((g) => (g as LineString).getCoordinates()),
            layout
        );
    } else if (type.includes("POLYGON")) {
        outGeom = new MultiPolygon(
            olGeoms.map((g) => (g as Polygon).getCoordinates()),
            layout
        );
    } else {
        outGeom = new GeometryCollection(olGeoms);
    }

    return wkt.writeGeometry(outGeom);
}
