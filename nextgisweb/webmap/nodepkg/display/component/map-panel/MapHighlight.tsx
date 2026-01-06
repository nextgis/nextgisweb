import { observer } from "mobx-react-lite";
import { Feature } from "ol";
import { WKT } from "ol/format";
import type { Geometry } from "ol/geom";
import Point from "ol/geom/Point";
import type VectorSource from "ol/source/Vector";
import { Circle, RegularShape, Stroke, Style } from "ol/style";
import { useEffect, useRef } from "react";

import type { HighlightStore } from "@nextgisweb/webmap/highlight-store";
import type { HighlightEvent } from "@nextgisweb/webmap/highlight-store/HighlightStore";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import Vector from "@nextgisweb/webmap/ol/layer/Vector";

type Props = {
    mapStore: MapStore;
    highlightStore: HighlightStore;
    strokeColor?: string;
};

const wkt = new WKT();

function toOlFeature(
    e: HighlightEvent,
    { highlightStyle, crossStyle }: { highlightStyle: Style; crossStyle: Style }
): Feature<Geometry> | null {
    if (e.coordinates) {
        const f = new Feature<Geometry>({
            geometry: new Point(e.coordinates),
            layerId: e.layerId,
            featureId: e.featureId,
        });
        f.setStyle(crossStyle);
        return f;
    }
    try {
        const geometry = e.olGeometry
            ? e.olGeometry
            : e.geom
              ? wkt.readGeometry(e.geom)
              : e.coordinates;

        if (geometry) {
            const f = new Feature<Geometry>({
                geometry,
                layerId: e.layerId,
                featureId: e.featureId,
            });
            f.setStyle(highlightStyle);
            return f;
        }
    } catch {
        return null;
    }

    return null;
}

export const MapHighlight = observer(function MapHighlight({
    mapStore,
    highlightStore,
    strokeColor = "rgba(255,255,0,1)",
}: Props) {
    const overlayRef = useRef<Vector | null>(null);
    const sourceRef = useRef<VectorSource | null>(null);
    const maxZIndexRef = useRef(mapStore.maxZIndex);

    useEffect(() => {
        const layer = new Vector("highlight", { title: "Highlight Overlay" });
        const zi = maxZIndexRef.current * 2;
        layer.olLayer.setZIndex(zi);

        const source = layer.olLayer.getSource();
        if (!source) return;

        overlayRef.current = layer;
        sourceRef.current = source;

        mapStore.addLayer(layer);

        return () => {
            if (layer) {
                mapStore.removeLayer(layer);
            }
        };
    }, [mapStore]);

    useEffect(() => {
        overlayRef.current?.setZIndex(mapStore.maxZIndex + 1);
        maxZIndexRef.current = mapStore.maxZIndex;
    }, [mapStore.maxZIndex]);

    useEffect(() => {
        const hlStroke = new Stroke({ width: 3, color: strokeColor });
        const hlStyle = new Style({
            stroke: hlStroke,
            image: new Circle({ stroke: hlStroke, radius: 5 }),
        });

        const stroke = new Stroke({ width: 2, color: strokeColor });
        const crossStyle = new Style({
            image: new RegularShape({
                points: 4,
                radius: 10,
                angle: Math.PI / 4,
                stroke,
            }),
        });

        const source = sourceRef.current;
        if (!source) return;
        source.clear();
        for (const e of highlightStore.highlighted) {
            const f = toOlFeature(e, {
                highlightStyle: hlStyle,
                crossStyle,
            });
            if (f) source.addFeature(f);
        }
    }, [highlightStore.highlighted, strokeColor]);

    return null;
});
