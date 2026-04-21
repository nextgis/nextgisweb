import type { RenderPostprocess } from "@nextgisweb/render/type/api";

export type SharedPostprocessPreset = string;
export type SelectedPostprocessPresetKey = SharedPostprocessPreset | null;

export type SharedPostprocessValue = {
  [K in keyof RenderPostprocess]-?: NonNullable<RenderPostprocess[K]>;
};

export type SharedPostprocessPatch = Partial<SharedPostprocessValue>;

export interface SharedPostprocessPresetDefinition {
  key: SharedPostprocessPreset;
  label: string;
  postprocess: SharedPostprocessPatch;
}

export interface SharedPostprocessConfig {
  defaults: SharedPostprocessValue;
  presets: SharedPostprocessPresetDefinition[];
}

type SharedPostprocessField =
  | SharedPostprocessValue[keyof SharedPostprocessValue]
  | undefined;

export const DEFAULT_POSTPROCESS_VALUE: SharedPostprocessValue = {
  brightness: 1,
  contrast: 1,
  gamma: 1,
  saturation: 1,
  sharpen: 0,
  blur_radius: 0,
  grayscale: false,
  invert: false,
  tint_strength: 0,
  tint_color: "#000000",
  paper_texture: 0,
  wet_wash: 0,
  rough_edges: 0,
  pigment_overlay: 0,
  pencil_sketch: 0,
  wet_edge: 0,
  grain: 0,
  pastel_softness: 0,
  hatching: 0,
  seed: 42,
};

let activePostprocessDefaults: SharedPostprocessValue = {
  ...DEFAULT_POSTPROCESS_VALUE,
};

function hasSeedDrivenEffect(value: SharedPostprocessValue) {
  return (
    value.paper_texture > 0 ||
    value.pigment_overlay > 0 ||
    value.rough_edges > 0 ||
    value.pencil_sketch > 0 ||
    value.wet_edge > 0 ||
    value.grain > 0 ||
    value.hatching > 0
  );
}

export function withPostprocessDefaults(
  value: SharedPostprocessPatch | null | undefined
): SharedPostprocessValue {
  return {
    ...activePostprocessDefaults,
    ...(value ?? {}),
  } as SharedPostprocessValue;
}

export function getPostprocessDefaults(): SharedPostprocessValue {
  return activePostprocessDefaults;
}

function normalizePostprocessPatch(
  value: SharedPostprocessPatch | Record<string, unknown>
): SharedPostprocessPatch {
  const normalized = {} as SharedPostprocessPatch;
  const normalizedRecord = normalized as Record<
    keyof SharedPostprocessValue,
    SharedPostprocessField
  >;

  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue !== undefined && fieldValue !== null) {
      normalizedRecord[key as keyof SharedPostprocessValue] =
        fieldValue as SharedPostprocessField;
    }
  }

  return normalized;
}

function buildPostprocessDefaults(
  value: SharedPostprocessPatch | Record<string, unknown> | null | undefined
): SharedPostprocessValue {
  return {
    ...DEFAULT_POSTPROCESS_VALUE,
    ...normalizePostprocessPatch(value ?? {}),
  } as SharedPostprocessValue;
}

export function setPostprocessDefaults(
  value: SharedPostprocessPatch | Record<string, unknown> | null | undefined
): SharedPostprocessValue {
  activePostprocessDefaults = buildPostprocessDefaults(value);
  return activePostprocessDefaults;
}

export function normalizePostprocessForUi<TRead>(
  value: TRead | SharedPostprocessPatch | null | undefined
): SharedPostprocessValue | null {
  if (!value) {
    return null;
  }

  return withPostprocessDefaults(
    normalizePostprocessPatch(
      value as SharedPostprocessPatch | Record<string, unknown>
    )
  );
}

export function isNoopPostprocess(
  value: SharedPostprocessPatch | SharedPostprocessValue | null | undefined
) {
  const resolved = withPostprocessDefaults(value);

  return (
    resolved.brightness === DEFAULT_POSTPROCESS_VALUE.brightness &&
    resolved.contrast === DEFAULT_POSTPROCESS_VALUE.contrast &&
    resolved.gamma === DEFAULT_POSTPROCESS_VALUE.gamma &&
    resolved.saturation === DEFAULT_POSTPROCESS_VALUE.saturation &&
    resolved.sharpen === DEFAULT_POSTPROCESS_VALUE.sharpen &&
    resolved.blur_radius === DEFAULT_POSTPROCESS_VALUE.blur_radius &&
    resolved.grayscale === DEFAULT_POSTPROCESS_VALUE.grayscale &&
    resolved.invert === DEFAULT_POSTPROCESS_VALUE.invert &&
    resolved.tint_strength === DEFAULT_POSTPROCESS_VALUE.tint_strength &&
    resolved.paper_texture === DEFAULT_POSTPROCESS_VALUE.paper_texture &&
    resolved.wet_wash === DEFAULT_POSTPROCESS_VALUE.wet_wash &&
    resolved.rough_edges === DEFAULT_POSTPROCESS_VALUE.rough_edges &&
    resolved.pigment_overlay === DEFAULT_POSTPROCESS_VALUE.pigment_overlay &&
    resolved.pencil_sketch === DEFAULT_POSTPROCESS_VALUE.pencil_sketch &&
    resolved.wet_edge === DEFAULT_POSTPROCESS_VALUE.wet_edge &&
    resolved.grain === DEFAULT_POSTPROCESS_VALUE.grain &&
    resolved.pastel_softness === DEFAULT_POSTPROCESS_VALUE.pastel_softness &&
    resolved.hatching === DEFAULT_POSTPROCESS_VALUE.hatching
  );
}

export function serializePostprocess(
  value: SharedPostprocessPatch | SharedPostprocessValue | null | undefined
): SharedPostprocessPatch | null {
  if (!value) {
    return null;
  }

  const resolved = withPostprocessDefaults(value);
  if (isNoopPostprocess(resolved)) {
    return null;
  }

  const result: SharedPostprocessPatch = {};

  if (resolved.brightness !== DEFAULT_POSTPROCESS_VALUE.brightness) {
    result.brightness = resolved.brightness;
  }
  if (resolved.contrast !== DEFAULT_POSTPROCESS_VALUE.contrast) {
    result.contrast = resolved.contrast;
  }
  if (resolved.gamma !== DEFAULT_POSTPROCESS_VALUE.gamma) {
    result.gamma = resolved.gamma;
  }
  if (resolved.saturation !== DEFAULT_POSTPROCESS_VALUE.saturation) {
    result.saturation = resolved.saturation;
  }
  if (resolved.sharpen !== DEFAULT_POSTPROCESS_VALUE.sharpen) {
    result.sharpen = resolved.sharpen;
  }
  if (resolved.blur_radius !== DEFAULT_POSTPROCESS_VALUE.blur_radius) {
    result.blur_radius = resolved.blur_radius;
  }
  if (resolved.grayscale !== DEFAULT_POSTPROCESS_VALUE.grayscale) {
    result.grayscale = resolved.grayscale;
  }
  if (resolved.invert !== DEFAULT_POSTPROCESS_VALUE.invert) {
    result.invert = resolved.invert;
  }
  if (resolved.tint_strength !== DEFAULT_POSTPROCESS_VALUE.tint_strength) {
    result.tint_strength = resolved.tint_strength;
    result.tint_color = resolved.tint_color;
  }
  if (resolved.paper_texture !== DEFAULT_POSTPROCESS_VALUE.paper_texture) {
    result.paper_texture = resolved.paper_texture;
  }
  if (resolved.wet_wash !== DEFAULT_POSTPROCESS_VALUE.wet_wash) {
    result.wet_wash = resolved.wet_wash;
  }
  if (resolved.rough_edges !== DEFAULT_POSTPROCESS_VALUE.rough_edges) {
    result.rough_edges = resolved.rough_edges;
  }
  if (resolved.pigment_overlay !== DEFAULT_POSTPROCESS_VALUE.pigment_overlay) {
    result.pigment_overlay = resolved.pigment_overlay;
  }
  if (resolved.pencil_sketch !== DEFAULT_POSTPROCESS_VALUE.pencil_sketch) {
    result.pencil_sketch = resolved.pencil_sketch;
  }
  if (resolved.wet_edge !== DEFAULT_POSTPROCESS_VALUE.wet_edge) {
    result.wet_edge = resolved.wet_edge;
  }
  if (resolved.grain !== DEFAULT_POSTPROCESS_VALUE.grain) {
    result.grain = resolved.grain;
  }
  if (resolved.pastel_softness !== DEFAULT_POSTPROCESS_VALUE.pastel_softness) {
    result.pastel_softness = resolved.pastel_softness;
  }
  if (resolved.hatching !== DEFAULT_POSTPROCESS_VALUE.hatching) {
    result.hatching = resolved.hatching;
  }
  if (
    hasSeedDrivenEffect(resolved) &&
    resolved.seed !== DEFAULT_POSTPROCESS_VALUE.seed
  ) {
    result.seed = resolved.seed;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function serializePostprocessForApi<TUpdate>(
  value: SharedPostprocessPatch | SharedPostprocessValue | null | undefined
): Exclude<TUpdate, undefined> {
  return serializePostprocess(value) as Exclude<TUpdate, undefined>;
}

export function normalizePostprocessPresets(
  value: unknown
): SharedPostprocessPresetDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      if (
        typeof candidate.key !== "string" ||
        typeof candidate.label !== "string"
      ) {
        return null;
      }

      return {
        key: candidate.key,
        label: candidate.label,
        postprocess: normalizePostprocessPatch(
          (candidate.postprocess as
            | SharedPostprocessPatch
            | Record<string, unknown>
            | undefined) ?? {}
        ),
      } satisfies SharedPostprocessPresetDefinition;
    })
    .filter((item): item is SharedPostprocessPresetDefinition => item !== null);
}

export function normalizePostprocessConfig(
  value: unknown
): SharedPostprocessConfig {
  if (!value || typeof value !== "object") {
    return {
      defaults: buildPostprocessDefaults(null),
      presets: [],
    };
  }

  const candidate = value as Record<string, unknown>;

  return {
    defaults: buildPostprocessDefaults(
      (candidate.defaults as
        | SharedPostprocessPatch
        | Record<string, unknown>
        | null
        | undefined) ?? null
    ),
    presets: normalizePostprocessPresets(candidate.presets),
  };
}

export function applyPostprocessPreset(
  preset: SharedPostprocessPresetDefinition
): SharedPostprocessValue {
  return withPostprocessDefaults(preset.postprocess);
}

export function createPostprocessAdapter<TRead, TUpdate>() {
  return {
    normalize(
      value: TRead | SharedPostprocessPatch | null | undefined
    ): SharedPostprocessValue | null {
      return normalizePostprocessForUi(value);
    },
    serialize(
      value: SharedPostprocessPatch | SharedPostprocessValue | null | undefined
    ): Exclude<TUpdate, undefined> {
      return serializePostprocessForApi<TUpdate>(value);
    },
  };
}
