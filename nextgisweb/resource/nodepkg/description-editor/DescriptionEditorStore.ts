import { action, observable, toJS } from "mobx";

export class DescriptionEditorStore {
    readonly identity = "resource.description";

    @observable accessor value: string | null = null;
    @observable accessor loaded: string | null = null;

    @action setValue(value: string | null) {
        this.value = value;
    }

    @action load(value: string) {
        this.value = this.loaded = value;
    }

    @action dump() {
        if (this.value === this.loaded) return undefined;
        return toJS(this.value);
    }

    get isValid() {
        return true;
    }
}
