import { Polygon } from "ol/geom";
import { fromLonLat, getPointResolution } from "ol/proj";
import type { ProjectionLike } from "ol/proj";

import type {
  PanoramaPosition,
  PanoramaPov,
} from "@nextgisweb/webmap/panorama/type";

export function createPanoramaCameraGeometry(
  position: PanoramaPosition,
  { heading, fov }: Pick<PanoramaPov, "heading" | "fov">,
  projection: ProjectionLike
): Polygon {
  const center = fromLonLat([position.lng, position.lat]);
  const metersPerUnit = getPointResolution("EPSG:3857", 1, center, "m");
  // Panorama APIs do not provide a viewing range.
  // Use fixed distances for the camera indicator.
  const near = 2 / metersPerUnit;
  const far = 40 / metersPerUnit;
  const angle = (Math.max(1, Math.min(180, fov)) * Math.PI) / 180;
  const direction = (heading * Math.PI) / 180;
  const left = direction - angle / 2;
  const right = direction + angle / 2;
  const coordinate = (radius: number, bearing: number) => [
    center[0] + Math.sin(bearing) * radius,
    center[1] + Math.cos(bearing) * radius,
  ];

  if (fov < 150) {
    const nearLeft = coordinate(near, left);
    return new Polygon([
      [
        nearLeft,
        coordinate(far, left),
        coordinate(far, right),
        coordinate(near, right),
        nearLeft,
      ],
    ]).transform("EPSG:3857", projection);
  }

  const coordinates = [];
  const segments = 16;
  for (let i = 0; i <= segments; i++) {
    coordinates.push(coordinate(far, left + (angle * i) / segments));
  }
  for (let i = segments; i >= 0; i--) {
    coordinates.push(coordinate(near, left + (angle * i) / segments));
  }
  coordinates.push(coordinates[0]);
  return new Polygon([coordinates]).transform("EPSG:3857", projection);
}
