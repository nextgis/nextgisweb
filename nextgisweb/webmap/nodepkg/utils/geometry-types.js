import i18n from "@nextgisweb/pyramid/i18n";

export const getGeometryTypeTitle = (geometryType) => {
    switch (geometryType) {
        case "point": {
            return i18n.gettext("Point");
        }
        case "linestring": {
            return i18n.gettext("LineString");
        }
        case "linearring": {
            return i18n.gettext("LinearRing");
        }
        case "polygon": {
            return i18n.gettext("Polygon");
        }
        case "multipoint": {
            return i18n.gettext("MultiPoint");
        }
        case "multilinestring": {
            return i18n.gettext("MultiLineString");
        }
        case "multipolygon": {
            return i18n.gettext("MultiPolygon");
        }
        case "geometrycollection": {
            return i18n.gettext("GeometryCollection");
        }
    }
};
