import type OlMap from "ol/Map";

import {
  InfoScaleControl,
  MapToolbarControl,
  ScaleLineControl,
} from "../map-component/control";

export function PrintScaleToolbar({
  olMap,
  scaleValue,
  scaleLine,
}: {
  olMap: OlMap;
  scaleValue: boolean;
  scaleLine: boolean;
}) {
  if (!scaleValue && !scaleLine) {
    return null;
  }
  return (
    <MapToolbarControl
      id="print-map-scale-toolbar"
      position="bottom-left"
      direction="vertical"
      style={{ padding: "3px" }}
      gap={2}
      margin
      bar
    >
      {scaleValue && <InfoScaleControl order={1} />}
      {scaleLine && <ScaleLineControl olMap={olMap} order={2} />}
    </MapToolbarControl>
  );
}
