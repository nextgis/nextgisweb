import type Map from "ol/Map";
import GeoJSON from "ol/format/GeoJSON";
import { LineString, Polygon } from "ol/geom";
import type { Geometry } from "ol/geom";
import { Circle, Fill, Stroke, Style } from "ol/style";

import settings from "@nextgisweb/webmap/client-settings";
import { formatMetersArea, formatMetersLength } from "@nextgisweb/webmap/utils";
import type { DefaultConfig } from "@nextgisweb/webmap/utils/format-units";

export function createMeasureStyle(): Style {
    const fillColor = "rgba(7, 109, 191, .2)";
    const strokeColor = getComputedStyle(
        document.documentElement
    ).getPropertyValue("--primary");

    return new Style({
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: 2 }),
        image: new Circle({
            radius: 5,
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({ color: strokeColor }),
        }),
    });
}

export function isValidGeometry(geom: Geometry): boolean {
    if (geom instanceof Polygon) {
        const ring = geom.getLinearRing(0);
        return ring ? ring.getCoordinates().length > 3 : false;
    }
    if (geom instanceof LineString) {
        return geom.getCoordinates().length > 1;
    }
    return false;
}

export function formatUnits(value: number, isArea: boolean): string {
    const formatConfig: DefaultConfig = {
        format: "html-string",
        locale: ngwConfig.locale,
    };
    return (
        isArea
            ? formatMetersArea(
                  value,
                  settings.units_area ?? "sq_km",
                  formatConfig
              )
            : formatMetersLength(
                  value,
                  settings.units_length ?? "km",
                  formatConfig
              )
    ) as string;
}

export function getMapSRID(olMap: Map): number {
    const proj = olMap.getView().getProjection();
    return parseInt(proj.getCode().match(/EPSG:(\d+)/)![1], 10);
}

export function toGeoJSONRightHanded(geom: Geometry) {
    return new GeoJSON().writeGeometryObject(geom, { rightHanded: true });
}

export function getTooltipCoordinate(geom: Geometry): number[] | undefined {
    if (geom instanceof Polygon) {
        const ring = geom.getLinearRing(0);
        if (!ring || ring.getCoordinates().length <= 3) return;
        return geom.getInteriorPoint().getCoordinates();
    }
    if (geom instanceof LineString) {
        const coords = geom.getCoordinates();
        if (coords.length <= 1) return;
        return coords[coords.length - 1];
    }
}
