import { makeAutoObservable, toJS } from "mobx";

export class EditorStore {
    identity = "resource";

    cls = null;
    displayName = null;
    keyname = null;
    parent = null;
    ownerUser = null;

    sdnBase = null;
    sdnDynamic = null;

    constructor({ composite, operation }) {
        makeAutoObservable(this, { identity: false });
        this.composite = composite;
        this.operation = operation;

        this._loaded = {};
        this.cls = this.composite.cls;
        this.parent = this.composite.parent;
        this.ownerUser = this._loaded.ownerUser = this.composite.owner_user;

        this.sdnBase = composite.sdnBase;
        this.composite.watch("sdnDynamic", (attr, oldVal, newVal) => {
            this.sdnDynamic = newVal;
        });
    }

    load(value) {
        const loaded = {};
        this.displayName = loaded.displayName = value.display_name;
        this.keyname = loaded.keyname = value.keyname;
        this.parent = loaded.parent = value.parent ? value.parent.id : null;
        this.ownerUser = loaded.ownerUser = value.owner_user.id;
        this._loaded = loaded;
    }

    dump() {
        const result = {};
        const c = this._loaded;

        if (this.operation === "create") {
            result.cls = this.cls;
        }

        if (this.displayName !== c.displayName) {
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
