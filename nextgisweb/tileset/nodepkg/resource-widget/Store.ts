import { action, computed, observable } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    DumpParams,
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type";
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";
import type * as apitype from "@nextgisweb/tileset/type/api";

export class Store
    implements
        EditorStore<
            apitype.TilesetRead,
            apitype.TilesetCreate,
            apitype.TilesetUpdate
        >
{
    readonly identity = "tileset";

    @observable.shallow accessor source: FileMeta | null = null;
    @observable.ref accessor uploading = false;

    readonly operation: Operation;
    readonly composite: CompositeStore;

    constructor({ composite, operation }: EditorStoreOptions) {
        this.composite = composite;
        this.operation = operation;
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

    @action.bound
    update(props: Partial<this>) {
        Object.assign(this, props);
    }

    @computed
    get isValid() {
        return (
            !this.uploading && (this.operation === "update" || !!this.source)
        );
    }

    @computed
    get suggestedDisplayName() {
        const base = this.source?.name;
        return base ? base.replace(/\.\w*$/, "") : undefined;
    }
}
