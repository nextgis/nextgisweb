import { makeAutoObservable, runInAction, toJS } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import type {
    DumpParams,
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type";
import type { Composite } from "@nextgisweb/resource/type/Composite";
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
    identity = "tileset";

    source: FileMeta | null = null;
    uploading = false;

    operation?: Operation;
    composite: Composite;

    constructor({ composite, operation }: EditorStoreOptions) {
        makeAutoObservable(this, { identity: false });
        this.composite = composite;
        this.operation = operation;
    }

    load(val: apitype.TilesetRead) {
        console.log(val);
    }

    dump({ lunkwill }: DumpParams) {
        const result: apitype.TilesetUpdate = {};

        if (this.source) {
            result.source = this.source;
            result.srs = srsSettings.default;
        }

        lunkwill.suggest(!!this.source);

        return toJS(result);
    }

    update = (props: Partial<this>) => {
        runInAction(() => {
            Object.assign(this, props);
        });
    };

    get isValid() {
        return (
            !this.uploading && (this.operation === "update" || !!this.source)
        );
    }

    get suggestedDisplayName() {
        const base = this.source?.name;
        return base ? base.replace(/\.\w*$/, "") : undefined;
    }
}
