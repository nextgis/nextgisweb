import { toJS, makeAutoObservable } from "mobx";

export class DescriptionEditorStore {
    identity = "resource.description";

    value = null;

    constructor() {
        makeAutoObservable(this, { identity: false });
    }

    load(value) {
        this.value = value;
    }

    dump() {
        return toJS(this.value);
    }

    get isValid() {
        return true;
    }
}
