import { makeAutoObservable, toJS } from "mobx";

import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { gettext } from "@nextgisweb/pyramid/i18n";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
import type { EditorStoreOptions, Operation } from "@nextgisweb/resource/type";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

type Value = CompositeRead["raster_mosaic"];
type Data = CompositeRead["raster_mosaic"]["data"];

let keySeq = 0;

export class File {
    id = undefined;
    display_name = undefined;
    file_upload = undefined;

    store: Store;
    key: number;

    constructor(store: Store, data: Data) {
        makeAutoObservable(this);
        this.store = store;
        this.key = ++keySeq;

        Object.assign(this, data);
    }
}

export class Store {
    identity = "raster_mosaic";

    items: File[] = [];
    dirty = false;

    operation?: Operation;

    constructor({ operation }: EditorStoreOptions) {
        makeAutoObservable(this, { identity: false });
        this.items = [];
        this.operation = operation;
    }

    load(value: Value) {
        this.items = value.items.map((data: Data) => new File(this, data));
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        const result: Value = {};
        if (this.operation === "create") {
            result.srs = srsSettings.default;
        }

        result.items = (this.items || []).map(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ({ store, key, ...rest }) => rest
        );
        return toJS(result);
    }

    get isValid() {
        return true;
    }

    appendFiles(files: FileMeta[]): [boolean, string | null] {
        const updated = this.items ? [...this.items] : [];
        for (const file_upload of files) {
            let { name } = file_upload;
            if (!/\.tiff?$/i.test(name)) {
                const msg = gettext("File '{}' has an invalid extension.");
                return [false, msg.replace("{}", name)];
            }
            name = name.replace(/\.tiff?$/i, "");
            updated.push(new File(this, { display_name: name, file_upload }));
        }
        this.items = updated;
        this.dirty = true;
        return [true, null];
    }

    // EdiTable

    validate = false;

    get rows() {
        return this.items || [];
    }

    deleteRow(row: File) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }
}
