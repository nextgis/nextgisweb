import { action, computed, observable } from "mobx";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { EditorStore } from "./EditorStore";

let idSeq = 0;

export interface RecordOption {
    key: string | undefined;
    value: unknown;
    type?: string;
    onUpdate?: () => boolean | string;
    lookupSortCallback?: () => void;
}

export class RecordItem implements RecordOption {
    @observable.ref accessor key: string | undefined = undefined;
    @observable.ref accessor value: unknown = undefined;
    @observable.ref accessor isSortError: boolean | "key" | "value" = false;

    readonly id: number;
    readonly store: EditorStore;
    onUpdate: (() => boolean | string) | undefined;
    lookupSortCallback: (() => void) | undefined;

    constructor(
        store: EditorStore,
        { key, value, onUpdate, lookupSortCallback }: RecordOption
    ) {
        this.store = store;
        this.id = ++idSeq;
        this.key = key;
        this.value = value;
        this.onUpdate = onUpdate;
        this.lookupSortCallback = lookupSortCallback;
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
                    } catch (err) {
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

        if (this.onUpdate) {
            const isRowNotOk = this.onUpdate();
            this.isSortError = isRowNotOk as boolean | "key" | "value";
        }

        this.store.dirty = true;

        this.store.rotatePlaceholder();
    }
}
