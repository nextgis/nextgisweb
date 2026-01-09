import { action, computed, observable } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    DumpParams,
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";
import type * as apitype from "@nextgisweb/tileset/type/api";

export class Store implements EditorStore<
    apitype.TilesetRead,
    apitype.TilesetCreate,
    apitype.TilesetUpdate
> {
    readonly identity = "tileset";
    readonly composite: CompositeStore;

    @observable.ref accessor source: FileMeta | null = null;

    @observable.ref accessor uploading = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
    }

    @action
    load() {
        // NOOP
    }

    dump({ lunkwill }: DumpParams) {
        const result: apitype.TilesetUpdate = {};

        if (this.source) {
            result.source = this.source;
            result.srs = srsSettings.default;
        }

        lunkwill.suggest(!!this.source);

        return result;
    }

    @computed
    get dirty() {
        return !!this.source;
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
        return base ? base.replace(/\.\w*$/, "") : undefined;
    }

    @action.bound
    update(props: Partial<this>) {
        Object.assign(this, props);
    }
}
