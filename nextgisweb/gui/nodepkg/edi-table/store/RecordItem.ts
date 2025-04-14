import { action, computed, observable } from "mobx";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { EditorStore } from "./EditorStore";

let idSeq = 0;

export interface RecordOption<V = any> {
    key: string;
    value: V;
    type?: string;
}

export class RecordItem<V = any> implements RecordOption<V> {
    @observable.ref accessor key: string = "";
    @observable.ref accessor value: V = undefined as V;

    readonly id: number;
    readonly store: EditorStore;

    constructor(store: EditorStore, { key, value }: RecordOption<V>) {
        this.store = store;
        this.id = ++idSeq;
        this.key = key;
        this.value = value;
    }

    @computed
    get type() {
        return this.value === null ? "null" : typeof this.value;
    }

    @computed
    get error() {
        if (this.key === "") return gettext("Key required");

        const duplicate = this.store.items.find(
            (cnd) => cnd.key === this.key && cnd.id !== this.id
        );

        if (duplicate) return gettext("Key not unique");

        return false;
    }

    @action
    update({ key, value, type }: Partial<RecordOption<V>>) {
        if (key !== undefined) {
            this.key = key;
        }

        let val = this.value as unknown;
        // If the new value is `null` and the current type is "number" convert it to 0
        // to prevents assigning `null` to a number field
        if (value !== undefined) {
            val = this.type === "number" && value === null ? 0 : value;
        }

        if (type !== undefined) {
            if (type === "string") {
                if (val === undefined || val === null) {
                    val = "";
                } else {
                    val = val.toString();
                }
                if (typeof this.value !== "string") {
                    val = "";
                }
            } else if (type === "number") {
                if (typeof val === "boolean") {
                    val = val ? 1 : 0;
                } else {
                    try {
                        val = JSON.parse(val as string);
                    } catch (err) {
                        // Do nothing
                    }
                }
                if (typeof val !== "number") {
                    val = 0;
                }
            } else if (type === "boolean") {
                val = !!val;
            } else if (type === "null") {
                val = null;
            }
        }

        this.value = val as V;

        this.store.dirty = true;

        this.store.rotatePlaceholder();
    }
}
