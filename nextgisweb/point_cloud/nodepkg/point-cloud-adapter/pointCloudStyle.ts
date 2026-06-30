import Color from "color";

import type {
  PointCloudColorStats,
  PointCloudStyleClassificationColor,
  PointCloudStyleConfig,
  RawPoint,
} from "./type";

const CLASSIFICATION_PALETTE = [
  "#8c510a",
  "#d8b365",
  "#f6e8c3",
  "#c7eae5",
  "#5ab4ac",
  "#01665e",
];

const RETURN_NUMBER_PALETTE = [
  "#2b83ba",
  "#abdda4",
  "#ffffbf",
  "#fdae61",
  "#d7191c",
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function percentile(values: number[], percent: number) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(
    (percent / 100) * (sorted.length - 1),
    0,
    sorted.length - 1
  );
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return lerp(sorted[lo], sorted[hi], frac);
}

function rgba(color: string, alpha = 1) {
  return Color(color).alpha(alpha).rgb().string();
}

function rampColor(start: string, end: string, t: number) {
  return Color(start)
    .mix(Color(end), clamp(t, 0, 1))
    .rgb()
    .string();
}

function classificationColor(
  mappings: PointCloudStyleClassificationColor[],
  classification: number | null
) {
  if (classification === null) {
    return rgba("#9e9e9e");
  }

  const explicit = mappings.find((item) => item.code === classification)?.color;
  return (
    explicit ??
    CLASSIFICATION_PALETTE[classification % CLASSIFICATION_PALETTE.length]
  );
}

function returnNumberColor(returnNumber: number | null) {
  if (returnNumber === null || returnNumber < 1) {
    return rgba("#9e9e9e");
  }
  return RETURN_NUMBER_PALETTE[
    (returnNumber - 1) % RETURN_NUMBER_PALETTE.length
  ];
}

export function createFeatureColors(
  points: RawPoint[],
  style: PointCloudStyleConfig,
  stats?: PointCloudColorStats
) {
  const zValues = points.map((point) => point.z);
  const intensityValues = points
    .map((point) => point.intensity)
    .filter((value): value is number => value !== null);

  const elevationMin = style.use_percentile_clip
    ? percentile(zValues, style.elevation_min_percent)
    : (stats?.zmin ?? Math.min(...zValues));
  const elevationMax = style.use_percentile_clip
    ? percentile(zValues, style.elevation_max_percent)
    : (stats?.zmax ?? Math.max(...zValues));

  const intensityMin = intensityValues.length
    ? Math.min(...intensityValues)
    : 0;
  const intensityMax = intensityValues.length
    ? Math.max(...intensityValues)
    : 1;

  return points.map((point) => {
    switch (style.mode) {
      case "rgb": {
        if (!point.rgb) {
          return rgba("#9e9e9e");
        }

        let [r, g, b] = point.rgb;
        if (style.intensity_modulation && point.intensity !== null) {
          const intensityRatio =
            (point.intensity - intensityMin) /
            Math.max(intensityMax - intensityMin, 1);
          const scale = clamp(intensityRatio, 0.15, 1);
          r *= scale;
          g *= scale;
          b *= scale;
        }

        return Color.rgb(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255))
          .rgb()
          .string();
      }
      case "classification":
        return classificationColor(
          style.classification_colors,
          point.classification
        );
      case "intensity": {
        const value = point.intensity ?? intensityMin;
        const ratio =
          (value - intensityMin) / Math.max(intensityMax - intensityMin, 1);
        const channel = Math.round(clamp(ratio, 0, 1) * 255);
        return Color.rgb(channel, channel, channel).rgb().string();
      }
      case "return_number":
        return returnNumberColor(point.returnNumber);
      case "elevation":
      default: {
        const ratio =
          (point.z - elevationMin) / Math.max(elevationMax - elevationMin, 1);
        return rampColor(style.ramp_start_color, style.ramp_end_color, ratio);
      }
    }
  });
}

export function getPointCloudLayerStyleVariables(style: PointCloudStyleConfig) {
  return {
    pointSize: style.point_size,
    opacity: style.opacity,
  };
}
