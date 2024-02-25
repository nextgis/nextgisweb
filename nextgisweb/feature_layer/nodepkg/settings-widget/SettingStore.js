import { makeAutoObservable, toJS } from "mobx";

export class SettingStore {
    identity = "feature_layer";

    versioningEnabled = false;

    dirty = false;

    constructor() {
        makeAutoObservable(this, { identity: false });
    }

    load(value) {
        this.versioningEnabled = !!value?.versioning?.enabled;
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return;
        const result = { versioning: { enabled: this.versioningEnabled } };
        return toJS(result);
    }

    get isValid() {
        return true;
    }

    update(source) {
        Object.entries(source).forEach(([key, value]) => (this[key] = value));
        this.dirty = true;
    }
}
