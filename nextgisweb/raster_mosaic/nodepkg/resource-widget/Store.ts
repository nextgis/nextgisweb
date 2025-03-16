import { action, computed, observable } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { gettextf } from "@nextgisweb/pyramid/i18n";
import type {
    RasterMosaicItemWrite as ItemWrite,
    RasterMosaicCreate,
    RasterMosaicRead,
    RasterMosaicUpdate,
} from "@nextgisweb/raster-mosaic/type/api";
import type {
    EditorStore,
    EditorStoreOptions,
    Operation,
} from "@nextgisweb/resource/type";
import srsSettings from "@nextgisweb/spatial-ref-sys/client-settings";

let keySeq = 0;

export class File {
    @observable.ref accessor id = undefined;
    @observable.ref accessor display_name: ItemWrite["display_name"];
    @observable.ref accessor file_upload: ItemWrite["file_upload"];

    readonly store: Store;
    readonly key: number;

    constructor(store: Store, data: ItemWrite) {
        this.store = store;
        this.key = ++keySeq;
        Object.assign(this, data);
    }
}

export class Store
    implements
        EditorStore<RasterMosaicRead, RasterMosaicCreate, RasterMosaicUpdate>
{
    readonly identity = "raster_mosaic";

    @observable.shallow accessor items: File[] = [];
    @observable.ref accessor dirty = false;

    readonly operation: Operation;

    constructor({ operation }: EditorStoreOptions) {
        this.items = [];
        this.operation = operation;
    }

    @action
    load(value: RasterMosaicRead) {
        this.items = value.items?.map((data) => new File(this, data)) || [];
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        const result: RasterMosaicUpdate | RasterMosaicCreate = {};
        if (this.operation === "create") {
            result.srs = srsSettings.default;
        }

        result.items = (this.items || []).map(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ({ store, key, ...rest }) => rest
        );
        return result;
    }

    @computed
    get isValid() {
        return true;
    }

    @action
    appendFiles(files: FileMeta[]): [boolean, string | null] {
        const updated = this.items ? [...this.items] : [];
        for (const file_upload of files) {
            let { name } = file_upload;
            if (!/\.tiff?$/i.test(name)) {
                const msgFmt = gettextf("File '{}' has an invalid extension.");
                return [false, msgFmt(name)];
            }
            name = name.replace(/\.tiff?$/i, "");
            updated.push(new File(this, { display_name: name, file_upload }));
        }
        this.items = updated;
        this.dirty = true;
        return [true, null];
    }

    // EdiTable

    @observable.ref accessor validate = false;

    @computed
    get rows() {
        return this.items || [];
    }

    @action
    deleteRow(row: File) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }
}
