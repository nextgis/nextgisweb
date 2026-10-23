import { observer } from "mobx-react-lite";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { useEffect, useMemo } from "react";

import { useCssVariable } from "@nextgisweb/gui/hook";
import type { HighlightStore } from "@nextgisweb/webmap/highlight-store";
import type { HighlightEvent } from "@nextgisweb/webmap/highlight-store/HighlightStore";
import type { GeoJsonLayerDefinition } from "@nextgisweb/webmap/layer-adapter";
import { useMapLayer } from "@nextgisweb/webmap/map-component/hook/useMapLayer";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

type Props = {
  mapStore: MapStore;
  highlightStore: HighlightStore;
};

function toOlFeature(e: HighlightEvent): Feature<Geometry> {
  const feature = new Feature<Geometry>({
    geometry: e.geom,
    layerId: e.layerId,
    featureId: e.featureId,
  });
  return feature;
}

export const MapHighlight = observer(function MapHighlight({
  mapStore,
  highlightStore,
}: Props) {
  const strokeColor = useCssVariable({
    name: "--ngw-webmap-selection-color",
    defaultValue: "rgba(255,255,0,1)",
  });

  const layerDefinition = useMemo<GeoJsonLayerDefinition>(
    () => ({
      type: "geojson",
      options: {
        name: "highlight",
        title: "Highlight Overlay",
        isTopLayer: true,
        target: true,
        featureProjection: mapStore.displayProjection,
      },
    }),
    [mapStore]
  );
  const layer = useMapLayer(mapStore, layerDefinition);

  useEffect(() => {
    const stroke = { color: strokeColor, width: 3 };
    layer?.setStyle({
      rules: [
        {
          symbolizers: [
            {
              type: "point",
              graphic: {
                size: 10,
                mark: { well_known_name: "circle", stroke },
              },
            },
            { type: "line", stroke },
            { type: "polygon", stroke },
          ],
        },
      ],
    });
  }, [layer, strokeColor]);

  useEffect(() => {
    layer?.setFeatures(highlightStore.highlighted.map(toOlFeature));
  }, [layer, highlightStore.highlighted]);

  return null;
});
