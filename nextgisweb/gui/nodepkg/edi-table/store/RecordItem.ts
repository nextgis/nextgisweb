import { makeAutoObservable } from "mobx";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { EditorStore } from "./EditorStore";

let idSeq = 0;

export interface RecordOption {
    key: string | undefined;
    value: unknown;
    type?: string;
}

export class RecordItem implements RecordOption {
    key: string | undefined = undefined;
    value: unknown = undefined;

    id: number;
    store: EditorStore;

    constructor(store: EditorStore, { key, value }: RecordOption) {
        makeAutoObservable(this);
        this.store = store;
        this.id = ++idSeq;
        this.key = key;
        this.value = value;
    }

    get type() {
        return this.value === null ? "null" : typeof this.value;
    }

    get error() {
        if (this.key === "") return gettext("Key required");

        const duplicate = this.store.items.find(
            (cnd) => cnd.key === this.key && cnd.id !== this.id
        );

        if (duplicate) return gettext("Key not unique");

        return false;
    }

    update({ key, value, type }: Partial<RecordOption>) {
        if (key !== undefined) {
            this.key = key;
        }

        if (value !== undefined) {
            this.value = this.type === "number" && value === null ? 0 : value;
        }

        if (type !== undefined) {
            if (type === "string") {
                if (this.value === undefined || this.value === null) {
                    this.value = "";
                } else {
                    this.value = this.value.toString();
                }
                if (typeof this.value !== "string") {
                    this.value = "";
                }
            } else if (type === "number") {
                if (typeof this.value === "boolean") {
                    this.value = this.value ? 1 : 0;
                } else {
                    try {
                        this.value = JSON.parse(this.value as string);
                    } catch (e) {
                        // Do nothing
                    }
                }
                if (typeof this.value !== "number") {
                    this.value = 0;
                }
            } else if (type === "boolean") {
                this.value = !!this.value;
            } else if (type === "null") {
                this.value = null;
            }
        }

        this.store.dirty = true;

        this.store.rotatePlaceholder();
    }
}
