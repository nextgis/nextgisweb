import { makeAutoObservable, runInAction, toJS } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import settings from "@nextgisweb/pyramid/settings!raster_layer";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
import type { Composite } from "@nextgisweb/resource/type/Composite";
import type {
    DumpParams,
    EditorStoreOptions,
    EditorStore as IEditorStore,
    Operation,
} from "@nextgisweb/resource/type/EditorStore";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

type Value = CompositeRead["raster_layer"];

export class EditorStore implements IEditorStore<Value> {
    identity = "raster_layer";

    source: FileMeta | null = null;
    uploading = false;
    cog = settings.cog_enabled;
    cogInitial: boolean | null = null;

    operation?: Operation;
    composite: Composite;

    constructor({ composite, operation }: EditorStoreOptions) {
        makeAutoObservable(this, { identity: false });
        this.operation = operation;
        this.composite = composite;
    }

    load(value: Value) {
        this.cog = this.cogInitial = !!value.cog;
    }

    dump({ lunkwill }: DumpParams) {
        const result: Value = {
            cog:
                !!this.source || this.cog !== this.cogInitial
                    ? this.cog
                    : undefined,
        };

        if (this.source) {
            result.source = this.source;
            result.srs = srsSettings.default;
        }

        lunkwill.suggest(
            this.operation === "create" ||
                !!this.source ||
                this.cog !== this.cogInitial
        );

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
        return base ? base.replace(/\.tiff?$/i, "") : undefined;
    }
}
