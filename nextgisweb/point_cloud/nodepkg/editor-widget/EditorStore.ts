import { action, computed, observable } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader/type";
import type * as apitype from "@nextgisweb/point-cloud/type/api";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
  DumpParams,
  EditorStoreOptions,
  EditorStore as IEditorStore,
} from "@nextgisweb/resource/type";

export type Mode = "upload" | "external_url" | "keep";

export interface ValidationState {
  is_valid: boolean;
  reason?: string | null;
  point_count?: number | null;
  point_format_id?: number | null;
  epsg?: number | null;
  wkt?: string | null;
  srs_required?: boolean;
  has_rgb?: boolean;
  has_intensity?: boolean;
  has_classification?: boolean;
  has_returns?: boolean;
}

export class EditorStore implements IEditorStore<
  apitype.PointCloudRead,
  apitype.PointCloudUpdate,
  apitype.PointCloudCreate
> {
  readonly identity = "point_cloud";
  readonly composite: CompositeStore;

  @observable.ref accessor mode: Mode;
  @observable.ref accessor source: FileMeta | null = null;
  @observable.ref accessor externalUrl = "";
  @observable.ref accessor externalUrlInitial = "";
  @observable.ref accessor srsId: number | null = null;
  @observable.ref accessor srsIdInitial: number | null = null;
  @observable.ref accessor uploading = false;
  @observable.ref accessor validating = false;
  @observable.ref accessor validation: ValidationState | null = null;
  @observable.ref accessor corsWarning: string | null = null;
  @observable.ref accessor dirty = false;

  constructor({ composite }: EditorStoreOptions) {
    this.composite = composite;
    this.mode = composite.operation === "create" ? "upload" : "keep";
  }

  @action
  load(value: apitype.PointCloudRead) {
    this.externalUrl = this.externalUrlInitial = value.external_url ?? "";
    this.srsId = this.srsIdInitial = value.srs?.id ?? null;
    this.validation = {
      is_valid: true,
      point_count: value.point_count,
      point_format_id: value.point_format_id,
      epsg: value.epsg,
      wkt: value.wkt,
      srs_required: false,
      has_rgb: value.has_rgb,
      has_intensity: value.has_intensity,
      has_classification: value.has_classification,
      has_returns: value.has_returns,
    };
    this.dirty = false;
  }

  dump({
    lunkwill,
  }: DumpParams):
    | apitype.PointCloudUpdate
    | apitype.PointCloudCreate
    | undefined {
    if (!this.dirty) return undefined;

    const result: apitype.PointCloudUpdate | apitype.PointCloudCreate = {};
    if (this.srsId !== null && this.srsId !== this.srsIdInitial) {
      result.srs = { id: this.srsId };
    }

    if (this.mode === "keep") {
      return Object.keys(result).length ? result : undefined;
    }

    lunkwill.suggest(true);

    if (this.mode === "upload") {
      result.source = { id: this.source!.id };
    } else {
      result.external_url = this.externalUrl;
    }

    return result;
  }

  @computed
  get isValid() {
    if (this.uploading || this.validating) return false;
    if (this.mode === "keep") return true;
    if (!this.validation?.is_valid) return false;
    if (this.validation.srs_required && this.srsId === null) return false;
    return this.mode === "upload" ? !!this.source : !!this.externalUrl.trim();
  }

  @computed
  get suggestedDisplayName() {
    const base =
      this.mode === "upload"
        ? this.source?.name
        : this.externalUrl.split("/").filter(Boolean).at(-1);
    return base ? base.replace(/\.copc\.laz$/i, "") : undefined;
  }

  @action.bound
  setMode(value: Mode) {
    this.mode = value;
    this.dirty = true;
  }

  @action.bound
  setSource(value: FileMeta | null) {
    this.source = value;
    this.validation = null;
    this.corsWarning = null;
    this.dirty = true;
  }

  @action.bound
  setExternalUrl(value: string) {
    this.externalUrl = value;
    this.validation = null;
    this.corsWarning = null;
    this.dirty = true;
  }

  @action.bound
  setSrsId(value: number | null) {
    this.srsId = value;
    this.dirty = true;
  }

  @action.bound
  setUploading(value: boolean) {
    this.uploading = value;
  }

  @action.bound
  setValidating(value: boolean) {
    this.validating = value;
  }

  @action.bound
  setValidation(value: ValidationState | null) {
    this.validation = value;
    this.dirty = true;
  }

  @action.bound
  setCorsWarning(value: string | null) {
    this.corsWarning = value;
  }
}
