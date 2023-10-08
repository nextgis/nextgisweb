import { makeAutoObservable, toJS } from "mobx";

import blueprint from "@nextgisweb/pyramid/api/load!/api/component/resource/blueprint";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgAllRequired = gettext("All fields are required");
const msgConflict = gettext("Row conflicts with another");

const resourceScopes = (i) => blueprint.resources[i].scopes;
const resourceBaseClasses = (i) => blueprint.resources[i].base_classes;

const isSameOrSubclass = (child, parent) =>
    child === parent || resourceBaseClasses(child).includes(parent);

let keySeq = 0;

class Item {
    action = null;
    principal = null;
    scope = null;
    permission = null;
    identity = null;
    propagate = null;

    constructor(store, data) {
        makeAutoObservable(this, {});
        this.store = store;
        this.key = ++keySeq;

        if (data) {
            this.action = data.action;
            this.principal = data.principal ? data.principal.id : null;
            this.scope = data.scope;
            this.permission = data.permission;
            this.identity = data.identity;
            this.propagate = data.propagate;

            // Existing data transformation
            if (this.identity === "resource") this.identity = "";

            if (
                !this.propagate &&
                this.identity !== "" &&
                this.identity !== null &&
                isSameOrSubclass(this.identity, this.store.resourceClass)
            ) {
                this.identity = "";
            }
        }
    }

    dump() {
        return toJS({
            action: this.action,
            principal: this.principal ? { id: this.principal } : null,
            scope: this.scope,
            permission: this.permission,
            identity: this.identity,
            propagate: this.propagate,
        });
    }

    get scopes() {
        if (this.identity) {
            return resourceScopes(this.identity);
        } else if (this.propagate === false) {
            return resourceScopes(this.store.resourceClass);
        } else if (this.propagate === true) {
            return Object.keys(blueprint.scopes);
        }
        return resourceScopes("resource");
    }

    get error() {
        if (
            this.action === null ||
            this.principal === null ||
            this.scope === null ||
            this.permission === null ||
            this.identity === null ||
            this.propagate === null
        ) {
            return msgAllRequired;
        }

        for (const other of this.store.items) {
            if (other.key === this.key) continue;

            // Compare only by the primary key. There are much more degenerate
            // and overlapping cases exist. We can promote them into errors and
            // warnings sometime.
            if (
                other.principal === this.principal &&
                other.scope === this.scope &&
                other.permission === this.permission &&
                other.identity === this.identity &&
                other.propagate === this.propagate
            ) {
                return msgConflict;
            }
        }

        return null;
    }

    update(data) {
        for (const [k, v] of Object.entries(data)) this[k] = v;

        // Reset a permission if it doesn't match with available scopes
        if (data.identity !== undefined || data.propagate !== undefined) {
            if (this.scope && !this.scopes.includes(this.scope)) {
                this.scope = null;
                this.permission = null;
            }
        }
        this.store.validate && this.error;
        this.store.dirty = true;

        this.store.rotatePlaceholder();
    }
}

export class PermissionsStore {
    identity = "resource.permissions";

    items = null;
    dirty = false;

    constructor({ composite }) {
        makeAutoObservable(this, { identity: false });
        this.resourceClass = composite.cls;
        this.items = [];

        this.rotatePlaceholder();
    }

    load(value) {
        // Existing data transformation
        const isUseful = (item) => item.propagate || item.identity === "";

        this.items = value.map((data) => new Item(this, data)).filter(isUseful);
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        return this.items.map((item) => item.dump());
    }

    get isValid() {
        if (!this.dirty) return true;
        this.validate = true;
        return this.items.every((item) => item.error === null);
    }

    // EdiTable

    validate = false;
    placeholder = null;

    get rows() {
        return this.items;
    }

    rotatePlaceholder() {
        if (this.placeholder && this.placeholder.action === null) return;
        this.placeholder && this.items.push(this.placeholder);
        this.placeholder = new Item(this);
    }

    deleteRow(row) {
        this.items.splice(this.items.indexOf(row), 1);
        this.dirty = true;
    }

    cloneRow(row) {
        const idx = this.items.indexOf(row);
        this.items.splice(idx + 1, 0, new Item(this, row.dump()));
        this.dirty = true;
    }
}
