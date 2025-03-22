import { isEmpty } from "lodash-es";
import { action, computed, observable } from "mobx";

import type { ResourceRead } from "@nextgisweb/resource/type/api";

import type { CompositeStore } from "../composite/CompositeStore";
import type { EditorStoreOptions } from "../type";

type NullableProperties<T> = {
    [P in keyof T]?: T[P] | null;
};

type Value = NullableProperties<Omit<ResourceRead, "parent" | "owner_user">> & {
    parent?: { id: number | null };
    owner_user?: { id: number | null };
};

interface Loaded {
    ownerUser: number | null;
    displayName: string | null;
    keyname: string | null;
    parent: number | null;
}

export class EditorStore {
    readonly identity = "resource";
    readonly composite: CompositeStore;

    @observable.ref accessor displayName: string | null = null;
    @observable.ref accessor keyname: string | null = null;
    @observable.ref accessor parent: number | null = null;
    @observable.ref accessor ownerUser: number | null = null;

    @observable.ref accessor sdnBase: string | null = null;

    @observable.shallow accessor _loaded: Loaded;
    @observable.ref accessor dirty: boolean = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;

        const ownerUser = this.composite.ownerUser;
        this._loaded = {
            ownerUser,
            displayName: null,
            keyname: null,
            parent: null,
        };
        this.ownerUser = ownerUser;

        this.parent = this.composite.parent;

        this.sdnBase = composite.sdnBase;
    }

    @computed
    get sdnDynamic() {
        return this.composite.sdnDynamic;
    }

    @action
    load(value: Value) {
        const loaded: Loaded = {
            displayName: value.display_name || null,
            keyname: value.keyname || null,
            parent: value.parent ? value.parent.id : null,
            ownerUser: value.owner_user ? value.owner_user.id : null,
        };

        this.displayName = loaded.displayName;
        this.keyname = loaded.keyname;
        this.parent = loaded.parent;
        this.ownerUser = loaded.ownerUser;

        this._loaded = loaded;
        this.dirty = false;
    }

    dump() {
        const result: Value = {};
        const c = this._loaded;

        if (this.composite.operation === "create") {
            result.cls = this.composite.cls;
        }

        if (this.parent !== c.parent || this.composite.operation === "create") {
            result.parent = { id: this.parent };
        }

        if (
            this.composite.operation === "create" ||
            this.displayName !== c.displayName
        ) {
            result.display_name = this.displayName
                ? this.displayName
                : this.sdnDynamic || this.sdnBase;
        }

        if (this.keyname !== c.keyname) {
            result.keyname = this.keyname ? this.keyname : null;
        }

        if (this.ownerUser !== c.ownerUser) {
            result.owner_user = { id: this.ownerUser };
        }

        return !isEmpty(result) ? result : undefined;
    }

    @action
    update(props: Partial<this>) {
        Object.assign(this, props);
        this.dirty = true;
    }

    @computed
    get isValid() {
        const c = this._loaded;
        return (
            (this.displayName === c.displayName || this.displayNameIsValid) &&
            (this.keyname === c.keyname || this.keynameIsValid)
        );
    }

    @computed
    get displayNameIsValid() {
        return !!(
            this.displayName ||
            (this.composite.operation === "create" &&
                (this.sdnDynamic || this.sdnBase))
        );
    }

    @computed
    get keynameIsValid() {
        return !this.keyname || /^[a-z][a-z0-9_-]*$/i.test(this.keyname);
    }
}
