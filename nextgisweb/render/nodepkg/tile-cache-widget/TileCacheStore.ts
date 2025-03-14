import { action, computed, observable, runInAction } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type * as apitype from "@nextgisweb/render/type/api";
import type { EditorStore } from "@nextgisweb/resource/type";

type Value = apitype.TileCacheUpdate;

const {
    enabled: enabled,
    image_compose: imageCompose,
    max_z: maxZ,
    ttl: ttl,
    flush: flush,
    $load: mapperLoad,
    $error: mapperError,
} = mapper<TileCacheStore, Value>({
    onChange: (o) => o.markDirty(),
    validateIf: (o) => o.validate,
});

export class TileCacheStore implements EditorStore<Value> {
    readonly identity = "tile_cache";

    enabled = enabled.init(false, this);
    imageCompose = imageCompose.init(false, this);
    maxZ = maxZ.init(null, this);
    ttl = ttl.init(null, this);
    flush = flush.init(false, this);

    @observable accessor dirty = false;
    @observable accessor validate = false;

    @action load(value: Value) {
        mapperLoad(this, value);
        this.dirty = false;
    }

    @action markDirty() {
        this.dirty = true;
    }

    dump() {
        if (!this.dirty) return undefined;
        return {
            ...this.enabled.jsonPart(),
            ...this.imageCompose.jsonPart(),
            ...this.maxZ.jsonPart(),
            ...this.ttl.jsonPart(),
            ...this.flush.jsonPart(),
        };
    }

    @computed get isValid() {
        runInAction(() => {
            this.validate = true;
        });
        return mapperError(this) === false;
    }
}
