import { toJS, makeAutoObservable } from "mobx";
import i18n from "@nextgisweb/pyramid/i18n";

class Record {
    key;
    value;
    placeholder;

    constructor({ store, id, key, value, placeholder = false }) {
        makeAutoObservable(this);
        this.store = store;
        this.id = id;
        this.key = key;
        this.value = value;
        this.placeholder = placeholder;
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

        this.placeholder = false;
        this.store.addPlaceholder();
    }
}

export class EditorStore {
    identity = "resmeta";
    items = [];
    nextId = 0;

    constructor() {
        makeAutoObservable(this, { identity: false });
        this.addPlaceholder();
    }

    load(value) {
        this.items = Object.entries(value.items).map(
            ([key, value], id) => new Record({ store: this, id, key, value })
        );
        this.nextId = this.items.length;
        this.addPlaceholder();
    }

    dump() {
        const items = {};
        this.items.forEach((itm) => {
            items[itm.key] = itm.value;
        });
        return { items: toJS(items) };
    }

    get isValid() {
        return this.items.every((r) => r.error === false);
    }

    delete(id) {
        this.items = this.items.filter((itm) => itm.id !== id);
        this.addPlaceholder();
    }

    addPlaceholder() {
        if (
            this.items.length == 0 ||
            !this.items[this.items.length - 1].placeholder
        ) {
            this.items.push(
                new Record({ store: this, id: this.nextId, placeholder: true })
            );
            this.nextId++;
        }
    }
}
