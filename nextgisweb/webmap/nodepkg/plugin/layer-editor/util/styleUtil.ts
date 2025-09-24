import type { Coordinate } from "ol/coordinate";
import {
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Polygon,
} from "ol/geom";
import type { Geometry } from "ol/geom";
import { Fill, Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import type { Options as StyleOptions } from "ol/style/Style";

export function colorForLayer(id: number | string) {
    const numId =
        typeof id === "number"
            ? id
            : Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    const hue = (numId * 137.508) % 360;
    const s = 82;
    const l = 48;
    const base = `hsl(${hue} ${s}% ${l}%)`;
    const fill = `hsl(${hue} ${s}% ${Math.max(30, l - 18)}% / 0.3)`;
    const fillSelect = `hsl(${hue} ${s}% ${Math.max(30, l - 12)}% / 0.7)`;
    return { stroke: base, fill, fillSelect };
}

export function generateStyleForId({ id }: { id: number | string }) {
    const c = colorForLayer(id);
    const layerStyle = new Style({
        stroke: new Stroke({ color: c.stroke, width: 2 }),
        fill: new Fill({ color: c.fill }),
        image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: c.fill }),
            stroke: new Stroke({ color: c.stroke, width: 2 }),
        }),
        zIndex: 100,
    });

    const vertexStyle = new Style({
        image: new CircleStyle({
            radius: 3,
            fill: new Fill({ color: c.fill }),
            stroke: new Stroke({ color: c.stroke, width: 1 }),
        }),
        geometry: (feature) => {
            const geom = feature.getGeometry() as Geometry | null;
            if (!geom) return undefined;

            const pts: Coordinate[] = [];

            if (geom instanceof Polygon) {
                for (const ring of geom.getCoordinates()) {
                    pts.push(...ring.slice(0, -1));
                }
            } else if (geom instanceof MultiPolygon) {
                for (const poly of geom.getCoordinates()) {
                    for (const ring of poly) {
                        pts.push(...ring.slice(0, -1));
                    }
                }
            } else if (geom instanceof LineString) {
                pts.push(...geom.getCoordinates());
            } else if (geom instanceof MultiLineString) {
                for (const line of geom.getCoordinates()) {
                    pts.push(...line);
                }
            } else {
                return undefined;
            }

            return pts.length ? new MultiPoint(pts) : undefined;
        },
        zIndex: 150,
    });

    const selectStyleOptions: StyleOptions = {
        stroke: new Stroke({ color: c.stroke, width: 3 }),
        fill: new Fill({ color: c.fillSelect }),
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: c.fillSelect }),
            stroke: new Stroke({ color: c.stroke, width: 3 }),
        }),
        zIndex: 200,
    };
    const selectStyle = new Style(selectStyleOptions);
    return {
        layerStyle,
        vertexStyle,
        selectStyle,
        selectStyleOptions,
    };
}
