import { clamp, remove } from "lodash-es";
import { action, computed, observable } from "mobx";
import type { IObservableArray } from "mobx";

import { EditorStore as KeyValueEditorStore } from "@nextgisweb/gui/edi-table";
import { RecordItem } from "@nextgisweb/gui/edi-table/store/RecordItem";
import type { RecordOption } from "@nextgisweb/gui/edi-table/store/RecordItem";
import type {
    LookupTableCreate,
    LookupTableRead,
    LookupTableUpdate,
} from "@nextgisweb/lookup-table/type/api";
import type { EditorStore as IEditorStore } from "@nextgisweb/resource/type";

import { isSortedWrong, recordsToLookup, sortLookupItems } from "./util";

export class EditorStore
    extends KeyValueEditorStore<
        LookupTableRead | LookupTableCreate | LookupTableUpdate
    >
    implements
        IEditorStore<LookupTableRead, LookupTableCreate, LookupTableUpdate>
{
    identity = "lookup_table";

    @observable.ref accessor sort: LookupTableRead["sort"] = "KEY_ASC";

    @observable.ref accessor order: string[] | undefined = undefined;

    @observable.ref accessor isSorted: boolean = true;

    @action
    setSort(val: LookupTableRead["sort"]) {
        if (val) this.sort = val;
        this.dirty = true;
        if (this.sort !== "CUSTOM") {
            this.order = undefined;
        }

        this.sortItems();
    }

    checkIfSorted(items: RecordItem[] | RecordOption[], sort: string) {
        const normalizedItems = recordsToLookup(items);

        return isSortedWrong(Object.entries(normalizedItems), sort);
    }

    @action
    sortItems() {
        const items = recordsToLookup(this.items);
        const sorted = sortLookupItems(Object.entries(items), this.sort);

        if (this.sort === "CUSTOM") {
            // handled by moveRow
        } else {
            this.items = sorted.map(
                ([key, value]) =>
                    new RecordItem(this, {
                        key,
                        value,
                        onUpdate: () =>
                            this.checkIfSorted(this.items, this.sort),
                        lookupSortCallback: () => this.sortItems(),
                    })
            );
        }
    }

    @computed
    get moveRow() {
        if (this.sort === "CUSTOM") {
            return (row: any, index: number) => {
                index = clamp(index, 0, this.rows.length - 1);
                const newRows = [...this.rows];
                remove(newRows, (i) => i === row);
                newRows.splice(index, 0, row);

                // type weirdness
                (this.rows as IObservableArray<RecordItem>).replace(newRows);

                this.order = newRows.map((row) => row.key as string);
            };
        } else {
            return undefined;
        }
    }

    @action
    load(value: LookupTableRead) {
        if (value) {
            if (value.sort) this.sort = value.sort;

            if (value.order) {
                this.order = value.order;

                const orderedEntries = value.order.map((key: string) => [
                    key,
                    value.items[key],
                ]);

                this.items = orderedEntries.map(
                    ([key, value]) =>
                        new RecordItem(this, {
                            key,
                            value,
                            onUpdate: () =>
                                this.checkIfSorted(this.items, this.sort),
                            lookupSortCallback: () => this.sortItems(),
                        })
                );
            } else {
                // Remove is value order is always present
                this.items = Object.entries(value.items).map(
                    ([key, value]) =>
                        new RecordItem(this, {
                            key,
                            value,
                            onUpdate: () =>
                                this.checkIfSorted(this.items, this.sort),
                            lookupSortCallback: () => this.sortItems(),
                        })
                );
            }

            this.dirty = false;
        }
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
        return { items, sort: this.sort, order: this.order };
    }
}
