import { makeAutoObservable, toJS } from "mobx";

import { gettext } from "@nextgisweb/pyramid/i18n";
import srsSettings from "@nextgisweb/pyramid/settings!spatial_ref_sys";

let keySeq = 0;

class File {
    id = undefined;
    display_name = undefined;
    file_upload = undefined;

    constructor(store, data) {
        makeAutoObservable(this);
        this.store = store;
        this.key = ++keySeq;
        Object.assign(this, data);
    }
}

export class Store {
    identity = "raster_mosaic";

    items = null;
    dirty = false;

    constructor({ operation }) {
        makeAutoObservable(this, { identity: false });
        this.items = [];
        this.operation = operation;
    }

    load(value) {
        this.items = value.items.map((data) => new File(this, data));
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        const result = {};
        if (this.operation === "create") result.srs = srsSettings.default;
        // eslint-disable-next-line no-unused-vars
        result.items = this.items.map(({ store, key, ...rest }) => rest);
        return toJS(result);
    }

    get isValid() {
        return true;
    }

    appendFiles(files) {
        const updated = [...this.items];
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
        return this.items;
    }

    deleteRow(row) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }
}
