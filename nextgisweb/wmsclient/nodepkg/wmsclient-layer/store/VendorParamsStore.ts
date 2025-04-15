import { action } from "mobx";

import {
    EdiTableKeyValueRow,
    EdiTableKeyValueStore,
} from "@nextgisweb/gui/edi-table";

type StoreValue = Record<string, string>;

export class VendorParamsStore extends EdiTableKeyValueStore<string> {
    identity = "";

    constructor(value?: StoreValue) {
        super({ defaultValue: "" });
        this.load(value);
    }

    @action
    load(val?: StoreValue) {
        if (val) {
            this.items = Object.entries(val).map(
                ([key, value]) =>
                    new EdiTableKeyValueRow<string>(this, { key, value })
            );
            this.dirty = false;
        }
    }

    dump(): StoreValue | undefined {
        if (!this.dirty) return undefined;
        return Object.fromEntries(this.items.map((i) => [i.key, i.value]));
    }
}
