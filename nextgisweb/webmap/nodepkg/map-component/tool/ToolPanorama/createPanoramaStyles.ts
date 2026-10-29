import { asArray } from "ol/color";
import { Circle as CircleGeometry, Point } from "ol/geom";
import { getPointResolution } from "ol/proj";
import type { ProjectionLike } from "ol/proj";
import { Circle, Fill, Stroke, Style } from "ol/style";

import { PANORAMA_SEARCH_RADIUS } from "@nextgisweb/webmap/panorama/constant";

export function createPanoramaStyles(projection: ProjectionLike): {
  dot: Style;
  camera: Style;
  search: Style[];
} {
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  const [r, g, b] = asArray(color);

  const dot = new Style({
    image: new Circle({
      radius: 4,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "#fff", width: 2 }),
    }),
    zIndex: 1,
  });

  const camera = new Style({
    fill: new Fill({ color: [r, g, b, 0.15] }),
    stroke: new Stroke({ color, width: 1.5 }),
    zIndex: 0,
  });

  const area = new Style({
    geometry: (feature) => {
      const geometry = feature.getGeometry();
      if (!(geometry instanceof Point)) return undefined;

      const center = geometry.getCoordinates();
      const metersPerUnit = getPointResolution(projection, 1, center);
      return new CircleGeometry(center, PANORAMA_SEARCH_RADIUS / metersPerUnit);
    },
    fill: new Fill({ color: [r, g, b, 0.15] }),
    stroke: new Stroke({ color, width: 1.5 }),
  });

  return { dot, camera, search: [area, dot] };
}
