import { makeAutoObservable, toJS } from "mobx";

export class DescriptionEditorStore {
    identity = "resource.description";

    value = null;
    loaded = null;

    constructor() {
        makeAutoObservable(this, { identity: false });
        this.loader = null;
    }

    load(value) {
        this.value = this.loaded = value;
    }

    dump() {
        if (this.value === this.loaded) return undefined;
        return toJS(this.value);
    }

    get isValid() {
        return true;
    }
}
