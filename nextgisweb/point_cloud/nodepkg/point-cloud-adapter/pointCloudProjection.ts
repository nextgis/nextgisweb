import { get as getProjection } from "ol/proj";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";

import type { PointCloudResourceData } from "./type";

export function ensurePointCloudProjectionKnown(
  pointCloud: PointCloudResourceData
) {
  const code = `EPSG:${pointCloud.srs.id}`;
  if (getProjection(code)) {
    return code;
  }

  const definition = pointCloud.srs_proj4?.trim();
  if (!definition) {
    throw new Error(`Projection definition is missing for ${code}`);
  }

  proj4.defs(code, definition);
  register(proj4);

  if (!getProjection(code)) {
    throw new Error(`Projection ${code} registration failed`);
  }

  return code;
}
