import { clamp, remove } from "lodash-es";
import { action, computed, observable, runInAction } from "mobx";
import type { IObservableArray } from "mobx";

import { EditorStore as KeyValueEditorStore } from "@nextgisweb/gui/edi-table";
import { RecordItem } from "@nextgisweb/gui/edi-table/store/RecordItem";
import type {
    LookupTableCreate,
    LookupTableRead,
    LookupTableUpdate,
} from "@nextgisweb/lookup-table/type/api";
import type { EditorStore as IEditorStore } from "@nextgisweb/resource/type";

import { lookupTableIsSorted, lookupTableSort } from "../util/sort";

export class EditorStore
    extends KeyValueEditorStore
    implements
        IEditorStore<LookupTableRead, LookupTableCreate, LookupTableUpdate>
{
    readonly identity = "lookup_table";

    @observable.ref accessor sort: LookupTableRead["sort"] = "KEY_ASC";

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
                    const newRows = [...this.rows];
                    remove(newRows, (i) => i === row);
                    newRows.splice(index, 0, row);

                    // type weirdness
                    (this.rows as IObservableArray<RecordItem>).replace(
                        newRows
                    );
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
            ([key, value]) => new RecordItem(this, { key, value })
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
