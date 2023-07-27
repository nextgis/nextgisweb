import { makeAutoObservable, toJS } from "mobx";

import type { EditorStore as IEditorStore } from "@nextgisweb/feature-layer/type";
import type { ExtensionValue } from "@nextgisweb/feature-layer/type";

class EditorStore implements IEditorStore<ExtensionValue<string>> {
    value: ExtensionValue<string> = null;

    _initValue: ExtensionValue<string> = null;

    constructor() {
        makeAutoObservable(this);
    }

    get dirty() {
        return this.value !== this._initValue;
    }

    load = (value: ExtensionValue<string>) => {
        this.value = value;
        this._initValue = toJS(value);
    };

    reset = () => {
        this.load(this._initValue);
    };
}

export default EditorStore;
