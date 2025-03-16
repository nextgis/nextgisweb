import { action } from "mobx";

import { EditorStore as KeyValueEditorStore } from "@nextgisweb/gui/edi-table";
import { RecordItem } from "@nextgisweb/gui/edi-table/store/RecordItem";
import type { LookupTableRead } from "@nextgisweb/lookup-table/type/api";

export class EditorStore extends KeyValueEditorStore<LookupTableRead> {
    identity = "lookup_table";

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

    dump(): LookupTableRead | undefined {
        if (!this.dirty) return undefined;

        const items = Object.fromEntries(
            this.items.map((i) => [i.key, String(i.value)])
        );
        return { items };
    }
}
