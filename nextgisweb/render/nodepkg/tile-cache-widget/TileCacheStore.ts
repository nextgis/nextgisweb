import { action, computed, observable } from "mobx";

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

    readonly enabled = enabled.init(false, this);
    readonly imageCompose = imageCompose.init(false, this);
    readonly maxZ = maxZ.init(null, this);
    readonly ttl = ttl.init(null, this);
    readonly flush = flush.init(false, this);

    @observable.ref accessor dirty = false;
    @observable.ref accessor validate = false;

    @action
    load(value: Value) {
        mapperLoad(this, value);
        this.dirty = false;
    }

    @action
    markDirty() {
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

    @computed
    get isValid() {
        return mapperError(this) === false;
    }
}
