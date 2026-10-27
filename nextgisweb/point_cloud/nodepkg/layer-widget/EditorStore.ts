import { action, actionBound, computed, observableRef } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import type * as apitype from "@nextgisweb/point-cloud/type/api";
import { route } from "@nextgisweb/pyramid/api";
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

  @observableRef accessor source: FileMeta | null = null;
  @observableRef accessor inspection: Inspection | null = null;
  @observableRef accessor inspectedId: string | null = null;
  @observableRef accessor storedInspection: Inspection | null = null;
  @observableRef accessor srsId: number | null = null;
  @observableRef accessor srsIdInitial: number | null = null;
  @observableRef accessor uploading = false;
  @observableRef accessor inspecting = false;

  private inspectAbort: AbortController | null = null;

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

  @actionBound
  setSource(value: FileMeta | null) {
    this.source = value;
    // FileUploader runs afterUpload loaders before onChange, so the
    // inspection of the same file must be kept
    if (!value || value.id !== this.inspectedId) {
      this.inspectAbort?.abort();
      this.inspection = null;
      this.inspectedId = null;
      this.srsId = this.srsIdInitial;
    }
  }

  @actionBound
  async inspectSource(fileId: string, signal?: AbortSignal) {
    this.inspectAbort?.abort();
    const controller = new AbortController();
    this.inspectAbort = controller;
    signal?.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
    this.setInspecting(true);
    try {
      const value = await route("point_cloud.inspect").post({
        json: { id: fileId },
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      this.setInspection(fileId, value);
    } finally {
      if (this.inspectAbort === controller) {
        this.inspectAbort = null;
        this.setInspecting(false);
      }
    }
  }

  @actionBound
  async loadStoredInspection(signal?: AbortSignal) {
    const { resourceId } = this.composite;
    if (resourceId === null) return;
    const value = await route("point_cloud.layer_inspect", resourceId).get({
      signal,
    });
    this.setStoredInspection(value);
  }

  @actionBound
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

  @actionBound
  setStoredInspection(value: Inspection) {
    this.storedInspection = value;
  }

  @actionBound
  setSrsId(value: number | null) {
    this.srsId = value;
  }

  @actionBound
  setUploading(value: boolean) {
    this.uploading = value;
  }

  @actionBound
  setInspecting(value: boolean) {
    this.inspecting = value;
  }
}
