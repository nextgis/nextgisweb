import { difference } from "lodash-es";
import { action, computed, observable, observe, runInAction } from "mobx";

import { mapper, validate } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import type { FocusTableStore } from "@nextgisweb/gui/focus-table";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";

interface FieldData {
    id: number | undefined;
    display_name: string;
    keyname: string;
    datatype: string | undefined;
    lookup_table: ResourceRef | null;
    label_field: boolean;
    grid_visibility: boolean;
    text_search: boolean;
}

const {
    id: fieldId,
    display_name: fieldDisplayName,
    keyname: fieldKeyname,
    datatype: fieldDatatype,
    lookup_table: fieldLookupTable,
    label_field: fieldLabelField,
    grid_visibility: fieldGridVisibility,
    text_search: fieldTextSearch,
    $load: fieldLoad,
    $error: fieldError,
} = mapper<Field, FieldData>({
    validateIf: (o) => o.store.validate,
    onChange: (o) => o.store.markDirty(),
});

fieldDisplayName.validate(
    validate.string({ minLength: 1 }),
    validate.unique((o) => o.store.fields, "displayName")
);

fieldKeyname.validate(
    validate.string({ minLength: 1 }),
    validate.unique((o) => o.store.fields, "keyname")
);

fieldDatatype.validate(validate.required());

export class Field {
    readonly store: FieldsStore;

    id = fieldId.init(undefined, this);
    displayName = fieldDisplayName.init("", this);
    keyname = fieldKeyname.init("", this);
    datatype = fieldDatatype.init("", this);
    lookupTable = fieldLookupTable.init(null, this);
    labelField = fieldLabelField.init(false, this);
    gridVisibility = fieldGridVisibility.init(true, this);
    textSearch = fieldTextSearch.init(true, this);

    constructor(store: FieldsStore, data: FieldData) {
        this.store = store;
        fieldLoad(this, data);
        observe(this.labelField, "value", () => {
            if (this.labelField.value) {
                this.store.fields.forEach((i) => {
                    if (i !== this && i.labelField.value)
                        i.labelField.value = false;
                });
            }
        });
    }

    json(): FieldData {
        return {
            ...this.id.jsonPart(),
            ...this.displayName.jsonPart(),
            ...this.keyname.jsonPart(),
            ...this.datatype.jsonPart(),
            ...(this.loookupTableAvailable
                ? this.lookupTable.jsonPart()
                : { lookup_table: null }),
            ...this.labelField.jsonPart(),
            ...this.gridVisibility.jsonPart(),
            ...this.textSearch.jsonPart(),
        };
    }

    @computed
    get error(): ErrorResult {
        return fieldError(this);
    }

    get loookupTableAvailable() {
        const dt = this.datatype.value;
        return dt ? ["INTEGER", "BIGINT", "STRING"].includes(dt) : false;
    }
}

export interface Value {
    fields: FieldData[];
}

export class FieldsStore implements EditorStore<Value>, FocusTableStore<Field> {
    readonly identity = "feature_layer";
    readonly composite: CompositeStore;

    fields = observable.array<Field>([]);
    existingFields = observable.array<Field>([]);

    @observable.ref accessor dirty = false;
    @observable.ref accessor validate = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
        observe(this.fields, () => this.markDirty());
    }

    @computed
    get isValid(): boolean {
        runInAction(() => {
            this.validate = true;
        });
        return this.fields.every((i) => i.error === false);
    }

    @action
    load({ fields }: Value) {
        this.fields.replace(fields.map((v) => new Field(this, v)));
        this.existingFields.replace(this.fields);
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;

        const fields = this.fields.map((i) => i.json());

        // Deleted fields need to be deleted explicitly
        for (const deleted of difference(this.existingFields, this.fields)) {
            fields.push({
                id: deleted.id.value,
                delete: true,
            } as unknown as FieldData);
        }

        return { fields };
    }

    @action
    markDirty() {
        this.dirty = true;
    }

    @computed
    get counter() {
        return this.fields.length;
    }

    // FocusTableStore

    getItemChildren(item: Field | null) {
        return item === null ? this.fields : undefined;
    }

    getItemContainer(item: Field) {
        return item && this.fields;
    }

    getItemParent() {
        return null;
    }

    getItemError(item: Field) {
        return item.error;
    }
}
