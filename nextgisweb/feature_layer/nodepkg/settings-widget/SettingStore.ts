import { action, computed, makeObservable, observable } from "mobx";

import type { EditorStore } from "@nextgisweb/resource/type";

interface Value {
    versioning?: { enabled?: boolean };
}

export class SettingStore implements EditorStore<Value> {
    readonly identity = "feature_layer";

    @observable accessor dirty = false;

    @observable accessor versioningEnabled = false;
    @observable accessor versioningExisting = false;

    constructor() {
        makeObservable(this);
    }

    @action load(value: Value) {
        this.versioningEnabled = !!value?.versioning?.enabled;
        this.versioningExisting = this.versioningEnabled;
        this.dirty = false;
    }

    dump(): Value | undefined {
        if (!this.dirty) return undefined;
        const result = { versioning: { enabled: this.versioningEnabled } };
        return result;
    }

    @computed get isValid() {
        return true;
    }

    @action update(source: Pick<this, "versioningEnabled">) {
        Object.assign(this, source);
        this.dirty = true;
    }
}
