import { makeAutoObservable, toJS } from "mobx";

interface TileCacheStoreOptions {
    featureTrackChanges: boolean;
    featureSeed: number;
}

interface Value {
    enabled?: boolean | null;
    image_compose?: boolean | null;
    track_changes?: boolean | null;
    max_z?: number | null;
    seed_z?: number | null;
    ttl?: number | null;
    flush?: boolean | null;
}

export class TileCacheStore {
    identity = "tile_cache";

    enabled: boolean | null = null;
    imageCompose: boolean | null = null;
    trackChanges: boolean | null = null;
    maxZ: number | null = null;
    seedZ: number | null = null;
    ttl: number | null = null;
    flush: boolean | null = null;
    featureTrackChanges: boolean | null = null;
    featureSeed: number | null = null;

    dirty = false;

    constructor({ featureTrackChanges, featureSeed }: TileCacheStoreOptions) {
        makeAutoObservable(this, { identity: false });
        this.featureTrackChanges = featureTrackChanges;
        this.featureSeed = featureSeed;
    }

    load(value: Value) {
        const loaded = {
            enabled: value.enabled || null,
            imageCompose: value.image_compose || null,
            trackChanges: value.track_changes || null,
            maxZ: value.max_z || null,
            seedZ: value.seed_z || null,
            ttl: value.ttl || null,
            flush: value.flush || null,
        };

        this.enabled = loaded.enabled;
        this.imageCompose = loaded.imageCompose;
        this.trackChanges = loaded.trackChanges;
        this.maxZ = loaded.maxZ;
        this.seedZ = loaded.seedZ;
        this.ttl = loaded.ttl;
        this.flush = loaded.flush;

        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return;
        const result: Value = {
            enabled: this.enabled,
            image_compose: this.imageCompose,
            track_changes: this.trackChanges,
            max_z: this.maxZ,
            seed_z: this.seedZ,
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
