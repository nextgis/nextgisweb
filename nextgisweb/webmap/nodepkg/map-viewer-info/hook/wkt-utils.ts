import WKT from "ol/format/WKT";
import { Point } from "ol/geom";
import { fromExtent } from "ol/geom/Polygon";

const wktFormat = new WKT();

export const pointToWkt = (coord: number[]) => {
    return `POINT(${coord[0]} ${coord[1]})`;
};

export const extentToWkt = (extent: number[]) => {
    const geometry = fromExtent(extent);
    return wktFormat.writeGeometry(geometry);
};

export const parseWktGeometry = (wkt: string | null) => {
    if (!wkt) return undefined;
    const geometry = wktFormat.readGeometry(wkt);
    if (geometry.getType() === "Point") {
        return (geometry as Point).getCoordinates() as number[];
    }
    return geometry.getExtent();
};
