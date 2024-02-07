import { EditorStore as KeyValueEditorStore } from "@nextgisweb/gui/edi-table/store/EditorStore";
import { RecordItem } from "@nextgisweb/gui/edi-table/store/RecordItem";
import type { RecordOption } from "@nextgisweb/gui/edi-table/store/RecordItem";

export class EditorStore extends KeyValueEditorStore<{
    items: RecordOption[];
}> {
    identity = "resmeta";

    load(value: { items: RecordOption[] }) {
        if (value) {
            this.items = Object.entries(value.items).map(
                ([key, value]) => new RecordItem(this, { key, value })
            );
            this.dirty = false;
        }
    }

    dump(): { items: RecordOption[] } | undefined {
        if (!this.dirty) return undefined;
        const items = Object.fromEntries(
            this.items.map((i) => [i.key, i.value])
        );
        // FIXME: Type of items should be Record<string, string | number | boolean | null>
        return { items: items as unknown as RecordOption[] };
    }
}
