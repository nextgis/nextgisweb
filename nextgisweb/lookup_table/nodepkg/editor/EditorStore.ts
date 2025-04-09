import { action, observable } from "mobx";

import { EditorStore as KeyValueEditorStore } from "@nextgisweb/gui/edi-table";
import { RecordItem } from "@nextgisweb/gui/edi-table/store/RecordItem";
import type {
    LookupTableCreate,
    LookupTableRead,
    LookupTableUpdate,
} from "@nextgisweb/lookup-table/type/api";
import type { EditorStore as IEditorStore } from "@nextgisweb/resource/type";

import { recordsToLookup, sortLookupItems } from "./util";

export class EditorStore
    extends KeyValueEditorStore<
        LookupTableRead | LookupTableCreate | LookupTableUpdate
    >
    implements
        IEditorStore<LookupTableRead, LookupTableCreate, LookupTableUpdate>
{
    identity = "lookup_table";

    @observable.ref accessor sort: LookupTableRead["sort"] = "KEY_ASC";

    @action
    setSort(val: LookupTableRead["sort"]) {
        if (val) this.sort = val;
        this.dirty = true;

        this.sortItems();
    }

    @action
    sortItems() {
        const items = recordsToLookup(this.items);
        const sorted = sortLookupItems(Object.entries(items), this.sort);

        if (this.sort === "CUSTOM") {
            // TO DO: implement cutom sort avtivation
        } else {
            this.items = sorted.map(
                ([key, value]) => new RecordItem(this, { key, value })
            );
        }
    }

    @action
    load(value: LookupTableRead) {
        if (value) {
            this.items = Object.entries(value.items).map(
                ([key, value]) => new RecordItem(this, { key, value })
            );

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
        return { items, sort: this.sort };
    }
}
