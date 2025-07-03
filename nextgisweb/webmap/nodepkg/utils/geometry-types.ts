import type { Type as OlGeometryType } from "ol/geom/Geometry";

import type { FeaureLayerGeometryType } from "@nextgisweb/feature-layer/type/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { Draw } from "ol/interaction";

export const getGeometryTypeTitle = (geometryType: string) => {
    switch (geometryType) {
        case "point": {
            return gettext("Point");
        }
        case "linestring": {
            return gettext("LineString");
        }
        case "linearring": {
            return gettext("LinearRing");
        }
        case "polygon": {
            return gettext("Polygon");
        }
        case "multipoint": {
            return gettext("MultiPoint");
        }
        case "multilinestring": {
            return gettext("MultiLineString");
        }
        case "multipolygon": {
            return gettext("MultiPolygon");
        }
        case "geometrycollection": {
            return gettext("GeometryCollection");
        }
    }
};

export const geometryTypeAliases: Record<
    FeaureLayerGeometryType,
    OlGeometryType
> = {
    POINT: "Point",
    LINESTRING: "LineString",
    POLYGON: "Polygon",
    MULTIPOINT: "MultiPoint",
    MULTILINESTRING: "MultiLineString",
    MULTIPOLYGON: "MultiPolygon",
    POINTZ: "Point",
    LINESTRINGZ: "LineString",
    POLYGONZ: "Polygon",
    MULTIPOINTZ: "MultiPoint",
    MULTILINESTRINGZ: "MultiLineString",
    MULTIPOLYGONZ: "MultiPolygon",
};

export function getOlGeometryType(type: FeaureLayerGeometryType) {
    return geometryTypeAliases[type];
}

export const zTypes: FeaureLayerGeometryType[] = [
    "POINTZ",
    "LINESTRINGZ",
    "POLYGONZ",
    "MULTIPOINTZ",
    "MULTILINESTRINGZ",
    "MULTIPOLYGONZ",
];

export function getOlLayout(
    type: FeaureLayerGeometryType
): Draw["geometryLayout_"] {
    return zTypes.includes(type) ? "XYZ" : "XY";
}
