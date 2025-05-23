import { isEqual } from "lodash-es";
import { action, computed, observable } from "mobx";

import type {
    EditorStore,
    EditorStoreConstructorOptions,
} from "@nextgisweb/feature-layer/type";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import type { FeatureEditorStore } from "../feature-editor/FeatureEditorStore";
import { marshalFieldValue, unmarshalFieldValue } from "../util/ngwAttributes";

import type { AppAttributes, NgwAttributeValue } from "./type";

class AttributeEditorStore implements EditorStore<NgwAttributeValue> {
    readonly _parentStore?: FeatureEditorStore;
    readonly _fields?: FeatureLayerFieldRead[];

    @observable.shallow accessor value: NgwAttributeValue = {};
    @observable.shallow private accessor _initValue: NgwAttributeValue = {};

    constructor({ parentStore, fields }: EditorStoreConstructorOptions = {}) {
        this._parentStore = parentStore;
        this._fields = fields;
        this.load(null);
    }

    @action
    load(value: NgwAttributeValue | null) {
        value ??= Object.fromEntries(
            this.fields.map(({ keyname }) => [keyname, null])
        );

        this.value = value;
        this._initValue = value;
    }

    @computed
    get isReady(): boolean {
        if (this._parentStore) {
            return !this._parentStore.initLoading;
        }
        return true;
    }

    /** Feature field values formatted for web */
    @computed
    get attributes() {
        const values: AppAttributes = {};
        if (this.value) {
            for (const field of this.fields) {
                const { keyname, datatype } = field;
                const val = this.value[keyname];
                values[keyname] =
                    val !== undefined
                        ? unmarshalFieldValue(datatype, val)
                        : undefined;
            }
        }
        return values;
    }

    @computed
    get fields(): FeatureLayerFieldRead[] {
        if (this._parentStore) {
            return this._parentStore.fields;
        } else if (this._fields) {
            return this._fields;
        }
        return [];
    }

    @computed
    get dirty(): boolean {
        if (this.value && this._initValue) {
            return !isEqual(this.value, this._initValue);
        }
        return false;
    }

    @computed
    get saving(): boolean {
        if (this._parentStore) {
            return this._parentStore.saving;
        }
        return false;
    }

    @action
    reset = () => {
        if (this._initValue) {
            this.load(this._initValue);
        }
    };

    @action
    setValues = (values: AppAttributes = {}) => {
        this.value = this._formatAttributes(values);
    };

    private _formatAttributes(values: AppAttributes) {
        const attributes: NgwAttributeValue = { ...this.value };
        for (const key in values) {
            const val = values[key];
            const field = this.fields.find((f) => f.keyname === key);
            if (field) {
                attributes[key] = marshalFieldValue(field.datatype, val);
            }
        }
        return attributes;
    }
}

export default AttributeEditorStore;
