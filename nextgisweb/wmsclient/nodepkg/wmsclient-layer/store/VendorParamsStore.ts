import { action } from "mobx";

import { EditorStore as KeyValueEditorStore } from "@nextgisweb/gui/edi-table/store/EditorStore";
import { RecordItem } from "@nextgisweb/gui/edi-table/store/RecordItem";

type StoreValue = Record<string, string>;
export class VendorParamsStore extends KeyValueEditorStore<StoreValue> {
    identity = "";

    constructor(value?: StoreValue) {
        super();
        this.load(value);
    }

    @action
    load(val?: StoreValue) {
        if (val) {
            this.items = Object.entries(val).map(
                ([key, value]) => new RecordItem(this, { key, value })
            );
            this.dirty = false;
        }
    }

    dump(): StoreValue | undefined {
        if (this.dirty) {
            const items = Object.fromEntries(
                this.items.map((i) => [i.key, String(i.value)])
            );
            return items;
        }
    }
}
