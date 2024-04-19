import { makeAutoObservable, runInAction, toJS } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
import type {
    DumpParams,
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type";
import type { Composite } from "@nextgisweb/resource/type/Composite";
import type {
    CompositeRead,
    CompositeUpdate,
} from "@nextgisweb/resource/type/api";

type Value = CompositeRead["tileset"];
type ValueUpdate = CompositeUpdate["tileset"];

export class Store implements EditorStore<Value> {
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

    load(val: Value) {
        console.log(val);
    }

    dump({ lunkwill }: DumpParams) {
        const result: ValueUpdate = {};

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
