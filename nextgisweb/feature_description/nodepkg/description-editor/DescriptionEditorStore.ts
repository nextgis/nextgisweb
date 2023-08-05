import { makeAutoObservable, toJS } from "mobx";

import type { EditorStore as IEditorStore } from "@nextgisweb/feature-layer/type";

class EditorStore implements IEditorStore<string | null> {
    _initValue: string | null = null;

    private _value: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get dirty() {
        return this.value !== this._initValue;
    }

    get value(): string | null {
        return this._value;
    }

    set value(val: string | null) {
        this._value = val;
    }

    load = (value: string | null) => {
        this.value = value;
        this._initValue = toJS(value);
    };

    reset = () => {
        this.load(this._initValue);
    };
}

export default EditorStore;
