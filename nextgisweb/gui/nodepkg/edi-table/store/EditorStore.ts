import { action, computed, makeObservable, observable } from "mobx";

import type { EdiTableStore } from "@nextgisweb/gui/edi-table";

import { RecordItem } from "./RecordItem";

export class EditorStore<V = unknown, D = V>
    implements EdiTableStore<RecordItem>
{
    identity = "";

    items: RecordItem[] = [];
    dirty = false;

    constructor() {
        // Used makeObservable instead makeAutoObservable to be able to extend EditorStore class
        makeObservable(this, {
            items: observable,
            dirty: observable,
            validate: observable,
            placeholder: observable,
            isValid: computed,
            rows: computed,
            load: action,
            dump: action,
            rotatePlaceholder: action,
            deleteRow: action,
            cloneRow: action,
        });

        this.items = [];

        this.rotatePlaceholder();
    }

    load(value: V) {
        console.log(value);
    }

    dump(): D | undefined {
        return this.items as D;
    }

    get isValid() {
        this.validate = true;
        return this.items.every((r) => r.error === false);
    }

    // EdiTable

    validate = false;
    placeholder: RecordItem | null = null;

    get rows() {
        return this.items;
    }

    setDirty(val: boolean) {
        this.dirty = val;
    }

    rotatePlaceholder() {
        if (this.placeholder && !this.placeholder.key) return;
        this.placeholder && this.items.push(this.placeholder);
        this.placeholder = new RecordItem(this, { key: "", value: undefined });
    }

    deleteRow(row: RecordItem) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }

    cloneRow(row: RecordItem) {
        const idx = this.items.indexOf(row);
        const data = { key: row.key, value: row.value };
        this.items.splice(idx + 1, 0, new RecordItem(this, data));
        this.dirty = true;
    }
}
