import { makeAutoObservable, toJS } from "mobx";

export class DescriptionEditorStore {
    readonly identity = "resource.description";

    value: string | null = null;
    loaded: string | null = null;

    constructor() {
        makeAutoObservable(this, { identity: false });
    }

    setValue(value: string | null) {
        this.value = value;
    }

    load(value: string) {
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
