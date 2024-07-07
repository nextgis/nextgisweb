import { makeAutoObservable, toJS } from "mobx";

interface Value {
    enabled?: boolean | null;
    image_compose?: boolean | null;
    max_z?: number | null;
    ttl?: number | null;
    flush?: boolean | null;
}

export class TileCacheStore {
    identity = "tile_cache";

    enabled: boolean | null = null;
    imageCompose: boolean | null = null;
    maxZ: number | null = null;
    ttl: number | null = null;
    flush: boolean | null = null;

    dirty = false;

    constructor() {
        makeAutoObservable(this, { identity: false });
    }

    load(value: Value) {
        const loaded = {
            enabled: value.enabled || null,
            imageCompose: value.image_compose || null,
            maxZ: value.max_z || null,
            ttl: value.ttl || null,
            flush: value.flush || null,
        };

        this.enabled = loaded.enabled;
        this.imageCompose = loaded.imageCompose;
        this.maxZ = loaded.maxZ;
        this.ttl = loaded.ttl;
        this.flush = loaded.flush;

        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return;
        const result: Value = {
            enabled: this.enabled,
            image_compose: this.imageCompose,
            max_z: this.maxZ,
            ttl: this.ttl,
            flush: this.flush,
        };
        return toJS(result);
    }

    get isValid() {
        return true;
    }

    update(source: Partial<TileCacheStore>) {
        Object.entries(source).forEach(([key, value]) => {
            if (key in this && key !== "isValid") {
                (this as unknown as Record<string, unknown>)[key] = value;
            }
        });
        this.dirty = true;
    }
}
