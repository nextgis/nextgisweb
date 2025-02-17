import { action, computed, observable, runInAction } from "mobx";

import type { EdiTableStore } from "@nextgisweb/gui/edi-table";

import { RecordItem } from "./RecordItem";

export class EditorStore<V = unknown, D = V>
    implements EdiTableStore<RecordItem>
{
    identity = "";

    @observable.shallow accessor items: RecordItem[] = [];
    @observable accessor dirty = false;

    constructor() {
        this.rotatePlaceholder();
    }

    @action
    load(value: V) {
        console.log(value);
    }

    @action
    dump(): D | undefined {
        return this.items as D;
    }

    @computed
    get isValid() {
        runInAction(() => {
                    runInAction(() => {
            this.validate = true;
        });
        });
        return this.items.every((r) => r.error === false);
    }

    // EdiTable

    @observable accessor validate = false;
    @observable.shallow accessor placeholder: RecordItem | null = null;

    @computed
    get rows() {
        return this.items;
    }

    @action
    setDirty(val: boolean) {
        this.dirty = val;
    }

    @action
    rotatePlaceholder() {
        if (this.placeholder && !this.placeholder.key) return;
        if (this.placeholder) {
            this.items.push(this.placeholder);
        }
        this.placeholder = new RecordItem(this, { key: "", value: undefined });
    }

    @action
    deleteRow(row: RecordItem) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }

    @action
    cloneRow(row: RecordItem) {
        const idx = this.items.indexOf(row);
        const data = { key: row.key, value: row.value };
        this.items.splice(idx + 1, 0, new RecordItem(this, data));
        this.dirty = true;
    }
}
