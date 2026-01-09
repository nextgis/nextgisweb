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
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";

export class EditorStore implements IEditorStore<
    apitype.RasterLayerRead,
    apitype.RasterLayerUpdate
> {
    readonly identity = "raster_layer";
    readonly composite: CompositeStore;

    @observable.ref accessor source: FileUploadObject | undefined = undefined;
    @observable.ref accessor uploading = false;
    @observable.ref accessor cog = settings.cogDefault;
    @observable.ref accessor cogInitial: boolean | undefined = undefined;

    @observable.ref accessor dirty = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
    }

    @action
    load(value: apitype.RasterLayerRead) {
        this.cog = this.cogInitial = !!value.cog;
        this.dirty = false;
    }

    dump({ lunkwill }: DumpParams): apitype.RasterLayerUpdate | undefined {
        if (!this.dirty) return;

        lunkwill.suggest(
            this.composite.operation === "create" ||
                !!this.source ||
                this.cog !== this.cogInitial
        );

        return {
            ...(this.source || this.cog !== this.cogInitial
                ? { cog: this.cog }
                : {}),
            ...(this.source
                ? { source: this.source, srs: srsSettings.default }
                : {}),
        };
    }

    @action
    update(props: Partial<this>) {
        Object.assign(this, props);
        if (props.source !== undefined || props.cog !== undefined) {
            this.dirty = true;
        }
    }

    @computed
    get isValid() {
        return (
            !this.uploading &&
            (this.composite.operation === "update" || !!this.source)
        );
    }

    @computed
    get suggestedDisplayName() {
        const base = this.source?.name;
        return base ? base.replace(/\.tiff?$/i, "") : undefined;
    }
}
