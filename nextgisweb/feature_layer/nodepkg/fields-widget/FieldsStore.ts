import { difference } from "lodash-es";
import { action, computed, observable, observableRef, observe } from "mobx";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { mapper, validate } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import type { FocusTableStore } from "@nextgisweb/gui/focus-table";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
  EditorStore,
  EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";
import type { Store } from "@nextgisweb/vector-layer/resource-widget/Store";

export type GridAggregation = NonNullable<
  FeatureLayerFieldRead["grid_aggregation"]
>;

interface FieldData {
  id: number | undefined;
  display_name: string;
  keyname: string;
  datatype: string | undefined;
  lookup_table: ResourceRef | null;
  grid_aggregation: GridAggregation | null;
  label_field: boolean;
  grid_visibility: boolean;
  text_search: boolean;
  required: boolean;
}

const {
  id: fieldId,
  display_name: fieldDisplayName,
  keyname: fieldKeyname,
  datatype: fieldDatatype,
  lookup_table: fieldLookupTable,
  grid_aggregation: fieldGridAggregation,
  label_field: fieldLabelField,
  grid_visibility: fieldGridVisibility,
  text_search: fieldTextSearch,
  required: fieldRequired,
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

  readonly id = fieldId.init(undefined, this);
  readonly displayName = fieldDisplayName.init("", this);
  readonly keyname = fieldKeyname.init("", this);
  readonly datatype = fieldDatatype.init("", this);
  readonly lookupTable = fieldLookupTable.init(null, this);
  readonly gridAggregation = fieldGridAggregation.init(null, this);
  readonly labelField = fieldLabelField.init(false, this);
  readonly gridVisibility = fieldGridVisibility.init(true, this);
  readonly textSearch = fieldTextSearch.init(true, this);
  readonly required = fieldRequired.init(false, this);

  constructor(store: FieldsStore, data: FieldData) {
    this.store = store;
    fieldLoad(this, data);
    observe(this.datatype, "value", () => {
      if (!this.gridAggregationAvailable) {
        this.gridAggregation.value = null;
      }
    });
    observe(this.labelField, "value", () => {
      if (this.labelField.value) {
        this.store.fields.forEach((i) => {
          if (i !== this && i.labelField.value) i.labelField.value = false;
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
      ...this.gridAggregation.jsonPart(),
      ...this.labelField.jsonPart(),
      ...this.gridVisibility.jsonPart(),
      ...this.textSearch.jsonPart(),
      ...this.required.jsonPart(),
    };
  }

  @computed
  get error(): ErrorResult {
    return fieldError(this);
  }

  private isDatatypeIn(datatypes: string[]) {
    const dt = this.datatype.value;
    return dt ? datatypes.includes(dt) : false;
  }

  get loookupTableAvailable() {
    return this.isDatatypeIn(["INTEGER", "BIGINT", "STRING"]);
  }

  get gridAggregationAvailable() {
    return this.isDatatypeIn(["INTEGER", "BIGINT", "REAL"]);
  }
}

export interface Value {
  fields: FieldData[];
}

export class FieldsStore implements EditorStore<Value>, FocusTableStore<Field> {
  readonly identity = "feature_layer";
  readonly composite: CompositeStore;

  readonly fields = observable.array<Field>([]);
  readonly existingFields = observable.array<Field>([]);

  @observableRef accessor dirty = false;
  @observableRef accessor validate = false;

  constructor({ composite }: EditorStoreOptions) {
    this.composite = composite;
    observe(this.fields, () => this.markDirty());
  }

  @computed
  get isAvailable() {
    if (this.composite.operation !== "create") {
      return true;
    }

    const vectorLayerStore = this.composite.members?.find(
      ({ store }) => store.identity === "vector_layer"
    )?.store as Store | undefined;

    return vectorLayerStore?.mode === "empty";
  }

  @computed
  get isValid(): boolean {
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
