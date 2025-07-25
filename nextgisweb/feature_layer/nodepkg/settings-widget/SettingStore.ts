import { action, computed, observable } from "mobx";

import type { FeatureLayerRead } from "@nextgisweb/feature-layer/type/api";
import type { EditorStore } from "@nextgisweb/resource/type";

type Value = Pick<FeatureLayerRead, "versioning">;

export class SettingStore implements EditorStore<Value> {
    readonly identity = "feature_layer";

    @observable.ref accessor dirty = false;

    @observable.ref accessor versioningEnabled = false;
    @observable.ref accessor versioningExisting = false;

    @action
    load(value: Value) {
        this.versioningEnabled = !!value?.versioning?.enabled;
        this.versioningExisting = this.versioningEnabled;
        this.dirty = false;
    }

    dump(): Value | undefined {
        if (!this.dirty) return undefined;
        return { versioning: { enabled: this.versioningEnabled } };
    }

    @computed
    get isValid() {
        return true;
    }

    @action
    update(source: Pick<this, "versioningEnabled">) {
        Object.assign(this, source);
        this.dirty = true;
    }
}
