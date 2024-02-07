import { EditorStore as KeyValueEditorStore } from "@nextgisweb/gui/edi-table/store/EditorStore";
import { RecordItem } from "@nextgisweb/gui/edi-table/store/RecordItem";

import type { LookupTableResource } from "../type/LookupTableResource";

export class EditorStore extends KeyValueEditorStore<LookupTableResource> {
    identity = "lookup_table";

    load(value: LookupTableResource) {
        if (value) {
            this.items = Object.entries(value.items).map(
                ([key, value]) => new RecordItem(this, { key, value })
            );
            this.dirty = false;
        }
    }

    dump(): LookupTableResource | undefined {
        if (!this.dirty) return undefined;

        const items = Object.fromEntries(
            this.items.map((i) => [i.key, String(i.value)])
        );
        return { items };
    }
}
