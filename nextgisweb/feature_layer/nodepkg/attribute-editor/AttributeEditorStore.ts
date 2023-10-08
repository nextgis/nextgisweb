import isEqual from "lodash-es/isEqual";
import { makeAutoObservable, runInAction, toJS } from "mobx";

import type {
    EditorStore,
    EditorStoreConstructorOptions,
    FeatureLayerField,
} from "@nextgisweb/feature-layer/type";

import type { FeatureEditorStore } from "../feature-editor/FeatureEditorStore";
import { formatNgwAttribute, parseNgwAttribute } from "../util/ngwAttributes";

import type { AppAttributes, NgwAttributeValue } from "./type";

class AttributeEditorStore implements EditorStore<NgwAttributeValue | null> {
    value: NgwAttributeValue | null = null;

    _initValue: NgwAttributeValue | null = null;

    readonly _parentStore?: FeatureEditorStore;
    readonly _fields?: FeatureLayerField[];

    constructor({ parentStore, fields }: EditorStoreConstructorOptions = {}) {
        this._parentStore = parentStore;
        this._fields = fields;
        makeAutoObservable(this, {
            _parentStore: false,
            _initValue: false,
            _fields: false,
        });
        if (this.fields) {
            this.load(
                Object.fromEntries(
                    this.fields.map(({ keyname }) => [keyname, null])
                )
            );
        }
    }

    load(value: NgwAttributeValue | null) {
        this.value = { ...value };
        this._initValue = toJS(value);
    }

    get isReady(): boolean {
        if (this._parentStore) {
            return !this._parentStore.initLoading;
        }
        return true;
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
        if (this._parentStore) {
            return this._parentStore.fields;
        } else if (this._fields) {
            return this._fields;
        }
        return [];
    }

    get dirty(): boolean {
        if (this.value && this._initValue) {
            return !isEqual(this.value, this._initValue);
        }
        return false;
    }

    get saving(): boolean {
        if (this._parentStore) {
            return this._parentStore.saving;
        }
        return false;
    }

    reset = () => {
        if (this._initValue) {
            this.load(this._initValue);
        }
    };

    setValues = (values: AppAttributes = {}) => {
        runInAction(() => {
            this.value = this._formatAttributes(values);
        });
    };

    private _formatAttributes(values: AppAttributes) {
        const attributes: NgwAttributeValue = { ...this.value };
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
