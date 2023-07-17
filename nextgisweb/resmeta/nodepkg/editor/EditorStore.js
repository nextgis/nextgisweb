import { makeAutoObservable } from "mobx";

import i18n from "@nextgisweb/pyramid/i18n";

let idSeq = 0;

class Record {
    key = undefined;
    value = undefined;

    constructor(store, { key, value }) {
        makeAutoObservable(this);
        this.store = store;
        this.id = ++idSeq;
        this.key = key;
        this.value = value;
    }

    get type() {
        if (this.value === null) {
            return "null";
        }
        const t = typeof this.value;
        if (t !== "undefined") {
            return t;
        }
    }

    get error() {
        if (this.key == "") {
            return i18n.gettext("Key name is required.");
        }

        const duplicate = this.store.items.find(
            (candidate) => candidate.key == this.key && candidate.id != this.id
        );

        if (duplicate) {
            return i18n.gettext("Key name is not unique.");
        }

        return false;
    }

    update({ key, value, type }) {
        if (key !== undefined) {
            this.key = key;
        }

        if (value !== undefined) {
            this.value = value;
        }

        if (type !== undefined) {
            if (type == "string") {
                if (this.value == undefined || this.value == null) {
                    this.value = "";
                } else {
                    this.value = this.value.toString();
                }
                if (typeof this.value != "string") {
                    this.value = "";
                }
            } else if (type == "number") {
                if (typeof this.value == "boolean") {
                    this.value = this.value ? 1 : 0;
                } else {
                    try {
                        this.value = JSON.parse(this.value);
                    } catch (e) {}
                }
                if (typeof this.value != "number") {
                    this.value = 0;
                }
            } else if (type == "boolean") {
                this.value = !!this.value;
            } else if (type == "null") {
                this.value = null;
            }
        }

        this.store.dirty = true;

        this.store.rotatePlaceholder();
    }
}

export class EditorStore {
    identity = "resmeta";

    items = null;
    dirty = false;

    constructor() {
        makeAutoObservable(this, { identity: false });
        this.items = [];

        this.rotatePlaceholder();
    }

    load(value) {
        this.items = Object.entries(value.items).map(
            ([key, value]) => new Record(this, { key, value })
        );
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        const items = Object.fromEntries(
            this.items.map((i) => [i.key, i.value])
        );
        return { items };
    }

    get isValid() {
        this.validate = true;
        return this.items.every((r) => r.error === false);
    }

    // EdiTable

    validate = false;
    placeholder = null;

    get rows() {
        return this.items;
    }

    rotatePlaceholder() {
        if (this.placeholder && !this.placeholder.key) return;
        this.placeholder && this.items.push(this.placeholder);
        this.placeholder = new Record(this, {});
    }

    deleteRow(row) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }

    cloneRow(row) {
        const idx = this.items.indexOf(row);
        const data = { key: row.key, value: row.value };
        this.items.splice(idx + 1, 0, new Record(this, data));
        this.dirty = true;
    }
}
