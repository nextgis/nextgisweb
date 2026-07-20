import type { GeometryLayout, Type as OlGeometryType } from "ol/geom/Geometry";

import type { FeatureLayerGeometryType } from "@nextgisweb/feature-layer/type/api";
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

export type SpatialGeometryType = Exclude<FeatureLayerGeometryType, "NONE">;

export const geometryTypeAliases: Record<SpatialGeometryType, OlGeometryType> =
  {
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

export function getOlGeometryType(type: FeatureLayerGeometryType) {
  if (type === "NONE") {
    throw new Error("Geometry type NONE is not supported");
  }
  return geometryTypeAliases[type];
}

export const zTypes: FeatureLayerGeometryType[] = [
  "POINTZ",
  "LINESTRINGZ",
  "POLYGONZ",
  "MULTIPOINTZ",
  "MULTILINESTRINGZ",
  "MULTIPOLYGONZ",
];

export function getOlLayout(type: FeatureLayerGeometryType): GeometryLayout {
  return zTypes.includes(type) ? "XYZ" : "XY";
}
