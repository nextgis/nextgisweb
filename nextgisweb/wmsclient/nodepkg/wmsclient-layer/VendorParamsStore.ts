import { runInAction } from "mobx";

import { EditorStore as KeyValueEditorStore } from "@nextgisweb/gui/edi-table/store/EditorStore";
import { RecordItem } from "@nextgisweb/gui/edi-table/store/RecordItem";

export class VendorParamsStore extends KeyValueEditorStore<
    Record<string, string>
> {
    identity = "";

    load(value: Record<string, string>) {
        if (value) {
            this.items = Object.entries(value).map(
                ([key, value]) => new RecordItem(this, { key, value })
            );
            this.dirty = false;
        }
    }

    dump(): Record<string, string> | undefined {
        if (this.dirty) {
            const items = Object.fromEntries(
                this.items.map((i) => [i.key, String(i.value)])
            );
            return items;
        }
    }
}
