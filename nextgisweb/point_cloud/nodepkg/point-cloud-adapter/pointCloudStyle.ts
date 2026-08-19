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

function normalizeRgbChannel(value: number) {
  const normalized = value > 255 ? Math.round(value / 257) : value;
  return clamp(normalized, 0, 255);
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

function minMax(values: number[], fallbackMin: number, fallbackMax: number) {
  if (!values.length) {
    return [fallbackMin, fallbackMax] as const;
  }

  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return [min, max] as const;
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
  const [zmin, zmax] = minMax(zValues, 0, 1);
  const [intensityMin, intensityMax] = minMax(intensityValues, 0, 1);

  const elevationMin = style.use_percentile_clip
    ? percentile(zValues, style.elevation_min_percent)
    : (stats?.zmin ?? zmin);
  const elevationMax = style.use_percentile_clip
    ? percentile(zValues, style.elevation_max_percent)
    : (stats?.zmax ?? zmax);

  return points.map((point) => {
    switch (style.mode) {
      case "rgb": {
        if (!point.rgb) {
          return rgba("#9e9e9e");
        }

        let [r, g, b] = point.rgb.map(normalizeRgbChannel) as [
          number,
          number,
          number,
        ];
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
