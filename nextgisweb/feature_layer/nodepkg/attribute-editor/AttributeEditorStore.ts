import { makeAutoObservable, runInAction, toJS } from "mobx";
import isEqual from "lodash-es/isEqual";

import { parseNgwAttribute, formatNgwAttribute } from "../util/ngwAttributes";

import type {
    EditorStoreConstructorOptions,
    FeatureLayerField,
    EditorStore,
} from "@nextgisweb/feature-layer/type";

import type { FeatureEditorStore } from "../feature-editor/FeatureEditorStore";
import type { AppAttributes, NgwAttributeValue } from "./type";

class AttributeEditorStore implements EditorStore<NgwAttributeValue> {
    value: NgwAttributeValue | null = null;

    _initValue: NgwAttributeValue | null = null;

    readonly _parentStore: FeatureEditorStore;

    constructor({ parentStore }: EditorStoreConstructorOptions) {
        this._parentStore = parentStore;
        makeAutoObservable(this, { _parentStore: false, _initValue: false });
    }

    load(value: NgwAttributeValue) {
        this.value = { ...value };
        this._initValue = toJS(value);
    }

    /** Feature field values formatted for web */
    get attributes() {
        const values: AppAttributes = {};
        if (this.value) {
            for (const field of this.fields) {
                const { keyname, datatype } = field;
                const val = this.value[keyname];
                values[keyname] = parseNgwAttribute(datatype, val);
            }
        }
        return values;
    }

    get fields(): FeatureLayerField[] {
        return this._parentStore.fields;
    }

    get dirty(): boolean {
        if (this.value && this._initValue) {
            return !isEqual(this.value, this._initValue);
        }
        return false;
    }

    reset = () => {
        this.load(this._initValue);
    };

    setValues = (values: AppAttributes = {}) => {
        runInAction(() => {
            this.value = this._formatAttributes(values);
        });
    };

    private _formatAttributes(values: AppAttributes) {
        const attributes = { ...this.value };
        for (const key in values) {
            const val = values[key];
            const field = this.fields.find((f) => f.keyname === key);
            if (field) {
                attributes[key] = formatNgwAttribute(field.datatype, val);
            }
        }
        return attributes;
    }
}

export default AttributeEditorStore;
