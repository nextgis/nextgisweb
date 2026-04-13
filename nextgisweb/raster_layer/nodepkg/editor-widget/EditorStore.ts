import { action, computed, observable } from "mobx";

import type { FileUploadObject } from "@nextgisweb/file-upload/type/api";
import settings from "@nextgisweb/raster-layer/client-settings";
import type * as apitype from "@nextgisweb/raster-layer/type/api";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
  DumpParams,
  EditorStoreOptions,
  EditorStore as IEditorStore,
} from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";

export type Mode = "upload" | "storage" | "keep";

export class EditorStore implements IEditorStore<
  apitype.RasterLayerRead,
  apitype.RasterLayerUpdate,
  apitype.RasterLayerCreate
> {
  readonly identity = "raster_layer";
  readonly composite: CompositeStore;

  @observable.ref accessor source: FileUploadObject | undefined = undefined;
  @observable.ref accessor uploading = false;
  @observable.ref accessor cog = settings.cogDefault;
  @observable.ref accessor cogInitial: boolean | undefined = undefined;
  @observable.ref accessor storage: ResourceRef | null = null;
  @observable.ref accessor storageInitial: ResourceRef | null = null;
  @observable.ref accessor storageFilename: string = "";
  @observable.ref accessor mode: Mode;

  @observable.ref accessor dirty = false;

  constructor({ composite }: EditorStoreOptions) {
    this.composite = composite;
    this.mode = composite.operation === "create" ? "upload" : "keep";
  }

  @action
  load(value: apitype.RasterLayerRead) {
    this.cog = this.cogInitial = !!value.cog;
    this.storage = this.storageInitial = value.storage ?? null;
    if (value.storage_filename) {
      this.storageFilename = value.storage_filename;
    }
    this.dirty = false;
  }

  dump({
    lunkwill,
  }: DumpParams):
    | apitype.RasterLayerUpdate
    | apitype.RasterLayerCreate
    | undefined {
    if (!this.dirty) return undefined;

    const isCreate = this.composite.operation === "create";

    if (this.mode === "keep") {
      if (this.cog === this.cogInitial) return undefined;
      lunkwill.suggest(true);
      return { cog: this.cog };
    }

    if (this.mode === "storage") {
      return {
        ...(isCreate ? { storage: this.storage! } : {}),
        storage_filename: this.storageFilename,
      };
    }

    // mode === "upload"
    lunkwill.suggest(isCreate || !!this.source || this.cog !== this.cogInitial);
    return {
      ...(this.source || this.cog !== this.cogInitial ? { cog: this.cog } : {}),
      ...(this.source ? { source: this.source, srs: srsSettings.default } : {}),
      ...(isCreate && this.storage ? { storage: this.storage } : {}),
    };
  }

  @action
  update(props: Partial<this>) {
    if ("storage" in props && !props.storage) {
      this.mode = "upload";
    }
    Object.assign(this, props);
    if (
      props.source !== undefined ||
      props.cog !== undefined ||
      props.storage !== undefined ||
      props.storageFilename !== undefined ||
      props.mode !== undefined
    ) {
      this.dirty = true;
    }
  }

  @computed
  get isValid() {
    if (this.uploading) return false;
    if (this.mode === "keep") return true;
    if (this.mode === "storage") {
      return !!this.storage && !!this.storageFilename;
    }
    // mode === "upload"
    const isCreate = this.composite.operation === "create";
    return !isCreate || !!this.source;
  }

  @computed
  get suggestedDisplayName() {
    if (this.source?.name) return this.source.name.replace(/\.tiff?$/i, "");
    if (this.storageFilename) return this.storageFilename.split("/").pop();
    return undefined;
  }
}
