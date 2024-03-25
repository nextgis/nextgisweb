import { makeAutoObservable, toJS } from "mobx";

import type { ResourceCls, ResourceRead } from "@nextgisweb/resource/type/api";

import type { EditorStoreOptions, Operation } from "../type";
import type { Composite } from "../type/Composite";

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
    identity = "resource";

    cls: ResourceCls | null = null;
    displayName: string | null = null;
    keyname: string | null = null;
    parent: number | null = null;
    ownerUser: number | null = null;

    sdnBase = null;
    sdnDynamic = null;

    operation?: Operation;
    composite?: Composite;

    _loaded: Loaded;

    constructor({ composite, operation }: EditorStoreOptions) {
        makeAutoObservable(this, { identity: false });
        this.composite = composite;
        this.operation = operation;

        const ownerUser = this.composite.owner_user;
        this._loaded = {
            ownerUser,
            displayName: null,
            keyname: null,
            parent: null,
        };
        this.ownerUser = ownerUser;

        this.cls = this.composite.cls;
        this.parent = this.composite.parent;

        this.sdnBase = composite.sdnBase;
        this.composite.watch("sdnDynamic", (attr, oldVal, newVal) => {
            this.sdnDynamic = newVal;
        });
    }

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

        // Update the _loaded property
        this._loaded = loaded;
    }

    dump() {
        const result: Value = {};
        const c = this._loaded;

        if (this.operation === "create") {
            result.cls = this.cls;
        }

        if (this.operation === "create" || this.displayName !== c.displayName) {
            result.display_name = this.displayName
                ? this.displayName
                : this.sdnDynamic || this.sdnBase;
        }

        if (this.keyname !== c.keyname) {
            result.keyname = this.keyname ? this.keyname : null;
        }

        if (this.parent !== c.parent) {
            result.parent = { id: this.parent };
        }

        if (this.ownerUser !== c.ownerUser) {
            result.owner_user = { id: this.ownerUser };
        }

        return toJS(result);
    }

    get isValid() {
        const c = this._loaded;
        return (
            (this.displayName === c.displayName || this.displayNameIsValid) &&
            (this.keyname === c.keyname || this.keynameIsValid)
        );
    }

    get displayNameIsValid() {
        return !!(
            this.displayName ||
            (this.operation === "create" && (this.sdnDynamic || this.sdnBase))
        );
    }

    get keynameIsValid() {
        return !this.keyname || /^[a-z][a-z0-9_-]*$/i.test(this.keyname);
    }
}
