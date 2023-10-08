import { makeAutoObservable, toJS } from "mobx";

export class TileCacheStore {
    identity = "tile_cache";

    enabled = null;
    imageCompose = null;
    trackChanges = null;
    maxZ = null;
    seedZ = null;
    ttl = null;
    flush = null;

    dirty = false;

    constructor({ featureTrackChanges, featureSeed }) {
        makeAutoObservable(this, { identity: false });
        this.featureTrackChanges = featureTrackChanges;
        this.featureSeed = featureSeed;
    }

    load(value) {
        this.enabled = value.enabled;
        this.imageCompose = value.image_compose;
        this.trackChanges = value.track_changes;
        this.maxZ = value.max_z;
        this.seedZ = value.seed_z;
        this.ttl = value.ttl;
        this.flush = value.flush;

        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return;
        const result = {};
        result.enabled = this.enabled;
        result.image_compose = this.imageCompose;
        result.track_changes = this.trackChanges;
        result.max_z = this.maxZ;
        result.seed_z = this.seedZ;
        result.ttl = this.ttl;
        result.flush = this.flush;
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
