import { action, computed, observable } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import type * as apitype from "@nextgisweb/point-cloud/type/api";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
  DumpParams,
  EditorStoreOptions,
  EditorStore as IEditorStore,
} from "@nextgisweb/resource/type";

export type Inspection = apitype.InspectResponse;

export class EditorStore implements IEditorStore<
  apitype.PointCloudLayerRead,
  apitype.PointCloudLayerUpdate,
  apitype.PointCloudLayerCreate
> {
  readonly identity = "point_cloud_layer";
  readonly composite: CompositeStore;

  @observable.ref accessor source: FileMeta | null = null;
  @observable.ref accessor inspection: Inspection | null = null;
  @observable.ref accessor inspectedId: string | null = null;
  @observable.ref accessor storedInspection: Inspection | null = null;
  @observable.ref accessor srsId: number | null = null;
  @observable.ref accessor srsIdInitial: number | null = null;
  @observable.ref accessor uploading = false;
  @observable.ref accessor inspecting = false;

  constructor({ composite }: EditorStoreOptions) {
    this.composite = composite;
  }

  @action
  load(value: apitype.PointCloudLayerRead) {
    this.srsId = this.srsIdInitial = value.srs.id;
  }

  dump({ lunkwill }: DumpParams) {
    const result: apitype.PointCloudLayerUpdate = {};
    if (this.source) {
      result.source = { id: this.source.id };
      lunkwill.suggest(true);
    }
    if (
      this.srsId !== null &&
      (this.source || this.srsId !== this.srsIdInitial)
    ) {
      result.srs = { id: this.srsId };
    }
    return Object.keys(result).length ? result : undefined;
  }

  @computed
  get dirty() {
    return !!this.source || this.srsId !== this.srsIdInitial;
  }

  @computed
  get isValid() {
    if (this.uploading || this.inspecting) return false;
    if (this.source) return !!this.inspection && this.srsId !== null;
    return this.composite.operation === "update";
  }

  @computed
  get suggestedDisplayName() {
    const base = this.source?.name;
    return base ? base.replace(/\.copc\.laz$/i, "") : undefined;
  }

  @action.bound
  setSource(value: FileMeta | null) {
    this.source = value;
    // FileUploader runs afterUpload loaders before onChange, so the
    // inspection of the same file must be kept
    if (!value || value.id !== this.inspectedId) {
      this.inspection = null;
      this.inspectedId = null;
      this.srsId = this.srsIdInitial;
    }
  }

  @action.bound
  setInspection(fileId: string, value: Inspection) {
    this.inspection = value;
    this.inspectedId = fileId;
    // Pick the only matching coordinate system automatically
    const candidates = value.srs_candidates;
    this.srsId = candidates.length === 1 ? candidates[0].id : null;
  }

  /** Inspection of the uploaded file or the stored one otherwise */
  @computed
  get currentInspection() {
    return this.source ? this.inspection : this.storedInspection;
  }

  @action.bound
  setStoredInspection(value: Inspection) {
    this.storedInspection = value;
  }

  @action.bound
  setSrsId(value: number | null) {
    this.srsId = value;
  }

  @action.bound
  setUploading(value: boolean) {
    this.uploading = value;
  }

  @action.bound
  setInspecting(value: boolean) {
    this.inspecting = value;
  }
}
