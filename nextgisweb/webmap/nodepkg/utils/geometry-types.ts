import { gettext } from "@nextgisweb/pyramid/i18n";

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
