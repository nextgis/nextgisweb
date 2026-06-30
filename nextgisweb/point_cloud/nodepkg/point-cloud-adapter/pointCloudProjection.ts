import { get as getProjection } from "ol/proj";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";

import type { PointCloudResourceData } from "./type";

type PointCloudProjectionInfo = {
  code: string;
  definition?: string;
  source: "file_epsg" | "file_wkt" | "resource_srs" | "default";
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function extractBracketedWkt(input: string, startIndex: number) {
  let depth = 0;
  let inside = false;

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index];
    if (char === "[") {
      depth += 1;
      inside = true;
    } else if (char === "]") {
      depth -= 1;
      if (inside && depth === 0) {
        return input.slice(startIndex, index + 1);
      }
    }
  }

  return input;
}

function getHorizontalWktDefinition(wkt: string) {
  const horizontalRoot =
    wkt.indexOf("PROJCRS[") >= 0
      ? "PROJCRS["
      : wkt.indexOf("PROJCS[") >= 0
        ? "PROJCS["
        : wkt.indexOf("GEOGCRS[") >= 0
          ? "GEOGCRS["
          : wkt.indexOf("GEOGCS[") >= 0
            ? "GEOGCS["
            : null;

  if (!horizontalRoot) {
    return wkt;
  }

  const startIndex = wkt.indexOf(horizontalRoot);
  if (startIndex < 0) {
    return wkt;
  }

  return extractBracketedWkt(wkt, startIndex);
}

export function getPointCloudProjectionInfo(
  pointCloud: PointCloudResourceData
): PointCloudProjectionInfo {
  const fileWkt = pointCloud.wkt?.trim() || undefined;
  const resourceProj4 = pointCloud.srs_proj4?.trim() || undefined;

  if (pointCloud.epsg) {
    return {
      code: `EPSG:${pointCloud.epsg}`,
      definition: fileWkt || resourceProj4,
      source: "file_epsg",
    };
  }

  if (fileWkt) {
    return {
      code: `POINT_CLOUD_WKT_${hashString(fileWkt)}`,
      definition: fileWkt,
      source: "file_wkt",
    };
  }

  if (pointCloud.srs?.id) {
    return {
      code: `EPSG:${pointCloud.srs.id}`,
      definition: resourceProj4,
      source: "resource_srs",
    };
  }

  return {
    code: "EPSG:3857",
    source: "default",
  };
}

export function getPointCloudProjectionCode(
  pointCloud: PointCloudResourceData
) {
  return getPointCloudProjectionInfo(pointCloud).code;
}

export function ensurePointCloudProjectionKnown(
  pointCloud: PointCloudResourceData
) {
  const { code, definition, source } = getPointCloudProjectionInfo(pointCloud);
  if (getProjection(code)) {
    return code;
  }

  if (!definition) {
    throw new Error(`Projection definition is missing for ${code}`);
  }

  if (
    pointCloud.epsg &&
    pointCloud.srs?.id &&
    pointCloud.epsg !== pointCloud.srs.id
  ) {
    console.warn("[PointCloudAdapter] CRS mismatch", {
      fileEpsg: pointCloud.epsg,
      resourceSrsId: pointCloud.srs.id,
      selectedProjectionCode: code,
      selectedProjectionSource: source,
    });
  }

  proj4.defs(code, definition);
  register(proj4);

  if (!getProjection(code)) {
    throw new Error(`Projection ${code} registration failed`);
  }

  return code;
}

export function createPointCloudCoordinateTransform(
  pointCloud: PointCloudResourceData,
  targetProjection: string
) {
  const info = getPointCloudProjectionInfo(pointCloud);

  if (info.source === "file_wkt" && info.definition) {
    const definition = getHorizontalWktDefinition(info.definition);
    const converter = proj4(definition, targetProjection);
    return {
      sourceProjection: info.code,
      projectionSource: info.source,
      transform: (coordinate: [number, number]) =>
        converter.forward(coordinate) as [number, number],
      inverseTransform: (coordinate: [number, number]) =>
        converter.inverse(coordinate) as [number, number],
    };
  }

  const sourceProjection = ensurePointCloudProjectionKnown(pointCloud);
  return {
    sourceProjection,
    projectionSource: info.source,
    transform: null as null,
    inverseTransform: null as null,
  };
}
