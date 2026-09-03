import { observer } from "mobx-react-lite";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type VectorSource from "ol/source/Vector";
import { Circle, Stroke, Style } from "ol/style";
import type { StyleLike } from "ol/style/Style";
import { useEffect, useRef } from "react";

import { useCssVariable } from "@nextgisweb/gui/hook";
import type { HighlightStore } from "@nextgisweb/webmap/highlight-store";
import type { HighlightEvent } from "@nextgisweb/webmap/highlight-store/HighlightStore";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import Vector from "@nextgisweb/webmap/ol/layer/Vector";

import { createTargetSymbolStyle } from "./targetSymbolStyle";

type Props = {
  mapStore: MapStore;
  highlightStore: HighlightStore;
};

function toOlFeature(e: HighlightEvent, style: StyleLike): Feature<Geometry> {
  const feature = new Feature<Geometry>({
    geometry: e.geom,
    layerId: e.layerId,
    featureId: e.featureId,
  });
  feature.setStyle(style);
  return feature;
}

export const MapHighlight = observer(function MapHighlight({
  mapStore,
  highlightStore,
}: Props) {
  const overlayRef = useRef<Vector | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);

  const strokeColor = useCssVariable({
    name: "--ngw-webmap-selection-color",
    defaultValue: "rgba(255,255,0,1)",
  });

  useEffect(() => {
    const layer = new Vector("highlight", {
      title: "Highlight Overlay",
      isTopLayer: true,
    });

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
    const hlStroke = new Stroke({ width: 3, color: strokeColor });
    const hlStyle = new Style({
      stroke: hlStroke,
      image: new Circle({ stroke: hlStroke, radius: 5 }),
    });

    const style = createTargetSymbolStyle(hlStyle, strokeColor);

    const source = sourceRef.current;
    if (!source) return;
    source.clear();

    for (const e of highlightStore.highlighted) {
      const feature = toOlFeature(e, style);
      source.addFeature(feature);
    }
  }, [highlightStore.highlighted, strokeColor]);

  return null;
});
