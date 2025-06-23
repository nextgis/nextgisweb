import { clamp } from "lodash-es";
import { action, computed, observable, runInAction } from "mobx";

import {
    EdiTableKeyValueRow,
    EdiTableKeyValueStore,
} from "@nextgisweb/gui/edi-table";
import type {
    LookupTableCreate,
    LookupTableRead,
    LookupTableUpdate,
} from "@nextgisweb/lookup-table/type/api";
import type { EditorStore as IEditorStore } from "@nextgisweb/resource/type";

import { lookupTableIsSorted, lookupTableSort } from "../util/sort";

export class EditorStore
    extends EdiTableKeyValueStore<string>
    implements
        IEditorStore<LookupTableRead, LookupTableCreate, LookupTableUpdate>
{
    readonly identity = "lookup_table";

    @observable.ref accessor sort: LookupTableRead["sort"] = "KEY_ASC";

    constructor() {
        super({ defaultValue: "" });
    }

    @action.bound
    setSort(value?: LookupTableRead["sort"]) {
        if (value) this.sort = value;
        this.dirty = true;

        if (this.sort === "CUSTOM") return;
        const items = lookupTableSort(this.items, this.sort);
        this.items = items;
    }

    @computed
    get isSorted() {
        if (this.sort === "CUSTOM") return true;
        return lookupTableIsSorted(this.items, this.sort);
    }

    @computed
    get moveRow() {
        if (this.sort === "CUSTOM") {
            return (row: any, index: number) => {
                runInAction(() => {
                    index = clamp(index, 0, this.rows.length - 1);
                    const newRows = this.rows.filter((item) => item !== row);
                    newRows.splice(index, 0, row);
                    this.rows.splice(0, this.rows.length, ...newRows);
                    this.dirty = true;
                });
            };
        } else {
            return undefined;
        }
    }

    @action
    load(value: LookupTableRead) {
        const items = Object.entries(value.items).map(
            ([key, value]) => new EdiTableKeyValueRow(this, { key, value })
        );
        this.items = lookupTableSort(items, value.sort, value.order);
        this.sort = value.sort;
        this.dirty = false;
    }

    @action.bound
    clear = () => {
        this.items = [];
    };

    dump(): LookupTableCreate | LookupTableUpdate | undefined {
        if (!this.dirty) return undefined;

        const items = Object.fromEntries(
            this.items.map((i) => [i.key, String(i.value)])
        );
        return { items, sort: this.sort, order: this.items.map((i) => i.key!) };
    }
}
