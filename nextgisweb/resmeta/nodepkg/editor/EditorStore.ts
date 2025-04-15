import { action } from "mobx";

import {
    EdiTableKeyValueRow,
    EdiTableKeyValueStore,
} from "@nextgisweb/gui/edi-table";
import type {
    ResmetaCreate,
    ResmetaRead,
    ResmetaUpdate,
} from "@nextgisweb/resmeta/type/api";
import type { EditorStore as IEditorStore } from "@nextgisweb/resource/type";

export type ValueType = ResmetaRead["items"][string];

export class EditorStore
    extends EdiTableKeyValueStore<ValueType>
    implements IEditorStore<ResmetaRead, ResmetaCreate, ResmetaUpdate>
{
    readonly identity = "resmeta";

    constructor() {
        super({ defaultValue: "" });
    }

    @action
    load(value: ResmetaRead) {
        if (value) {
            this.items = Object.entries(value.items).map(
                ([key, value]) =>
                    new EdiTableKeyValueRow<ValueType>(this, { key, value })
            );
            this.dirty = false;
        }
    }

    dump() {
        if (!this.dirty) return undefined;
        const items = Object.fromEntries(
            this.items.map((i) => [i.key, i.value])
        );
        return { items };
    }
}
