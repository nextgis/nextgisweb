import { action, computed, observable } from "mobx";
import { observer } from "mobx-react-lite";

import type { EdiTableStore } from "@nextgisweb/gui/edi-table";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { InputValue } from "../antd";

import type { EdiTableColumnComponentProps } from "./type";

const msgTypeToAdd = gettext("Type here to add a new item...");

let idSeq = 0;

interface RowData<V> {
    key: string;
    value: V;
    type?: string;
}

export class EdiTableKeyValueRow<V> implements RowData<V> {
    readonly id: number;
    readonly store: EdiTableKeyValueStore<V>;

    @observable.ref accessor key: string;
    @observable.ref accessor value: V;

    constructor(store: EdiTableKeyValueStore<V>, { key, value }: RowData<V>) {
        this.id = ++idSeq;
        this.store = store;
        this.key = key;
        this.value = value;
    }

    @computed
    get type() {
        return this.value === null ? "null" : typeof this.value;
    }

    @computed
    get error() {
        if (this.key === "") return gettext("Key required");

        const duplicate = this.store.items.find(
            (cnd) => cnd.key === this.key && cnd.id !== this.id
        );

        if (duplicate) return gettext("Key not unique");

        return false;
    }

    @action.bound
    setKey(value: string) {
        this.update({ key: value });
    }

    @action.bound
    setValue(value: V) {
        this.update({ value: value });
    }

    @action
    update({ key, value, type }: Partial<RowData<V>>) {
        if (key !== undefined) {
            this.key = key;
        }

        let val = this.value as unknown;
        // If the new value is `null` and the current type is "number" convert it to 0
        // to prevents assigning `null` to a number field
        if (value !== undefined) {
            val = this.type === "number" && value === null ? 0 : value;
        }

        if (type !== undefined) {
            if (type === "string") {
                if (val === undefined || val === null) {
                    val = "";
                } else {
                    val = val.toString();
                }
                if (typeof this.value !== "string") {
                    val = "";
                }
            } else if (type === "number") {
                if (typeof val === "boolean") {
                    val = val ? 1 : 0;
                } else {
                    try {
                        val = JSON.parse(val as string);
                    } catch (err) {
                        // Do nothing
                    }
                }
                if (typeof val !== "number") {
                    val = 0;
                }
            } else if (type === "boolean") {
                val = !!val;
            } else if (type === "null") {
                val = null;
            }
        }

        this.value = val as V;

        this.store.dirty = true;
        this.store.rotatePlaceholder();
    }
}

export class EdiTableKeyValueStore<V>
    implements EdiTableStore<EdiTableKeyValueRow<V>>
{
    identity = "";
    defaultValue: V;

    @observable.shallow accessor items: EdiTableKeyValueRow<V>[] = [];
    @observable.ref accessor dirty = false;

    constructor({ defaultValue }: { defaultValue: V }) {
        this.defaultValue = defaultValue;
        this.rotatePlaceholder();
    }

    @computed
    get isValid() {
        return this.items.every((r) => r.error === false);
    }

    @computed
    get counter() {
        return this.items.length;
    }

    // EdiTable

    @observable.ref accessor validate = false;
    @observable.shallow accessor placeholder: EdiTableKeyValueRow<V> | null =
        null;

    @computed
    get rows() {
        return this.items;
    }

    @action
    setDirty(val: boolean) {
        this.dirty = val;
    }

    @action
    rotatePlaceholder() {
        if (this.placeholder && !this.placeholder.key) return;
        if (this.placeholder) {
            this.items.push(this.placeholder);
        }
        this.placeholder = new EdiTableKeyValueRow<V>(this, {
            key: "",
            value: this.defaultValue,
        });
    }

    @action
    deleteRow(row: EdiTableKeyValueRow<V>) {
        this.rows.splice(this.rows.indexOf(row), 1);
        this.dirty = true;
    }

    @action
    cloneRow(row: EdiTableKeyValueRow<V>) {
        const idx = this.items.indexOf(row);
        const data = { key: row.key, value: row.value };
        this.items.splice(idx + 1, 0, new EdiTableKeyValueRow<V>(this, data));
        this.dirty = true;
    }
}

export const EdiTableKeyInput = observer<
    EdiTableColumnComponentProps<EdiTableKeyValueRow<any>>
>(({ row, placeholder, placeholderRef }) => {
    return (
        <InputValue
            ref={placeholderRef}
            variant="borderless"
            value={row.key}
            placeholder={placeholder ? msgTypeToAdd : undefined}
            onChange={row.setKey}
        />
    );
});

EdiTableKeyInput.displayName = "EdiTableKeyInput";

export const EdiTableValueInput = observer<
    EdiTableColumnComponentProps<EdiTableKeyValueRow<string>>
>(({ row }) => {
    return (
        <InputValue
            variant="borderless"
            value={row.value ?? ""}
            onChange={row.setValue}
        />
    );
});

EdiTableValueInput.displayName = "EdiTableValueInput";
