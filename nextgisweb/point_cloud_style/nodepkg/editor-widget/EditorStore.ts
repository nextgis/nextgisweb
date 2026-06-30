import { action, computed, observable } from "mobx";

import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
  EditorStoreOptions,
  EditorStore as IEditorStore,
} from "@nextgisweb/resource/type";

interface Capabilities {
  hasRgb: boolean;
  hasIntensity: boolean;
  hasClassification: boolean;
  hasReturns: boolean;
}

type StyleMode =
  | "elevation"
  | "classification"
  | "intensity"
  | "rgb"
  | "return_number";

interface StyleConfig {
  mode: StyleMode;
  point_size: number;
  opacity: number;
  use_percentile_clip: boolean;
  elevation_min_percent: number;
  elevation_max_percent: number;
  ramp_start_color: string;
  ramp_end_color: string;
  intensity_modulation: boolean;
  classification_colors: { code: number; color: string }[];
}

interface StyleRead {
  value: StyleConfig;
}

interface StyleWrite {
  value: StyleConfig;
}

const DEFAULT_CAPABILITIES: Capabilities = {
  hasRgb: false,
  hasIntensity: false,
  hasClassification: false,
  hasReturns: false,
};

function parseClassificationColors(
  value: string
): { code: number; color: string }[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [codeRaw, colorRaw] = line.split("=").map((part) => part.trim());
      return { code: Number(codeRaw), color: colorRaw };
    });
}

export class EditorStore implements IEditorStore<
  StyleRead,
  StyleWrite,
  StyleWrite
> {
  readonly identity = "point_cloud_style";
  readonly composite: CompositeStore;
  readonly capabilities: Capabilities;

  @observable.ref accessor mode: StyleMode = "elevation";
  @observable.ref accessor pointSize = 2;
  @observable.ref accessor opacity = 100;
  @observable.ref accessor usePercentileClip = true;
  @observable.ref accessor elevationMinPercent = 2;
  @observable.ref accessor elevationMaxPercent = 98;
  @observable.ref accessor rampStartColor = "#2b83ba";
  @observable.ref accessor rampEndColor = "#fdae61";
  @observable.ref accessor intensityModulation = false;
  @observable.ref accessor classificationColors = "";
  @observable.ref accessor dirty = false;

  constructor({
    composite,
    capabilities = DEFAULT_CAPABILITIES,
  }: EditorStoreOptions & { capabilities?: Capabilities }) {
    this.composite = composite;
    this.capabilities = capabilities;
  }

  @action
  load(value: StyleRead) {
    const cfg = value.value;
    this.mode = cfg.mode;
    this.pointSize = cfg.point_size;
    this.opacity = cfg.opacity;
    this.usePercentileClip = cfg.use_percentile_clip;
    this.elevationMinPercent = cfg.elevation_min_percent;
    this.elevationMaxPercent = cfg.elevation_max_percent;
    this.rampStartColor = cfg.ramp_start_color;
    this.rampEndColor = cfg.ramp_end_color;
    this.intensityModulation = cfg.intensity_modulation;
    this.classificationColors = cfg.classification_colors
      .map((item) => `${item.code}=${item.color}`)
      .join("\n");
    this.dirty = false;
  }

  dump(): StyleWrite | undefined {
    if (!this.dirty) return undefined;
    return {
      value: {
        mode: this.mode,
        point_size: this.pointSize,
        opacity: this.opacity,
        use_percentile_clip: this.usePercentileClip,
        elevation_min_percent: this.elevationMinPercent,
        elevation_max_percent: this.elevationMaxPercent,
        ramp_start_color: this.rampStartColor,
        ramp_end_color: this.rampEndColor,
        intensity_modulation: this.intensityModulation,
        classification_colors: parseClassificationColors(
          this.classificationColors
        ),
      },
    };
  }

  @computed
  get isValid() {
    if (this.pointSize <= 0) return false;
    if (this.opacity < 0 || this.opacity > 100) return false;
    if (this.elevationMinPercent >= this.elevationMaxPercent) return false;

    if (this.mode === "rgb" && !this.capabilities.hasRgb) return false;
    if (this.mode === "intensity" && !this.capabilities.hasIntensity)
      return false;
    if (
      this.mode === "classification" &&
      !this.capabilities.hasClassification
    ) {
      return false;
    }
    if (this.mode === "return_number" && !this.capabilities.hasReturns) {
      return false;
    }

    try {
      parseClassificationColors(this.classificationColors);
    } catch {
      return false;
    }

    return true;
  }

  @computed
  get supportedModes() {
    return [
      { value: "elevation", label: "Elevation" },
      ...(this.capabilities.hasClassification
        ? [{ value: "classification", label: "Classification" }]
        : []),
      ...(this.capabilities.hasIntensity
        ? [{ value: "intensity", label: "Intensity" }]
        : []),
      ...(this.capabilities.hasRgb ? [{ value: "rgb", label: "RGB" }] : []),
      ...(this.capabilities.hasReturns
        ? [{ value: "return_number", label: "Return number" }]
        : []),
    ];
  }

  @action.bound
  update(values: Partial<EditorStore>) {
    Object.assign(this, values);
    this.dirty = true;
  }
}
