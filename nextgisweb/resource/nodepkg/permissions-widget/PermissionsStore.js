import { makeAutoObservable, toJS } from "mobx";

import blueprint from "@nextgisweb/pyramid/api/load!/api/component/resource/blueprint";
import i18n from "@nextgisweb/pyramid/i18n";

const errRequired = i18n.gettext("All fields are required");
const errConflict = i18n.gettext("Row conflicts with another");

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

    get isPlaceholder() {
        return (
            this.action === null &&
            this.principal === null &&
            this.scope === null &&
            this.permission === null &&
            this.identity === null &&
            this.propagate === null
        );
    }

    get scopes() {
        if (this.identity) {
            return resourceScopes(this.identity);
        } else if (this.propagate === false) {
            return resourceScopes(this.store.resourceClass);
        } else if (this.propagate === true) {
            return Object.keys(blueprint.scopes);
        }
        return resourceScopes('resource');
    }

    get error() {
        if (this.isPlaceholder) return null;

        if (
            this.action === null ||
            this.principal === null ||
            this.scope === null ||
            this.permission === null ||
            this.identity === null ||
            this.propagate === null
        ) {
            return errRequired;
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
                return errConflict;
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
        this.store.addPlaceholderIfMissing();
        this.store.markDirty();
    }

    clone() {
        const idx = this.store.items.indexOf(this);
        const copy = new Item(this.store, this.dump());
        this.store.items.splice(idx + 1, 0, copy);
        this.store.markDirty();
    }

    delete() {
        this.store.items = this.store.items.filter((i) => i.key !== this.key);
        this.store.addPlaceholderIfMissing();
        this.store.markDirty();
    }
}

export class PermissionsStore {
    identity = "resource.permissions";

    items = null;
    dirty = null;
    validate = false;

    constructor({ composite }) {
        makeAutoObservable(this, { identity: false });
        this.resourceClass = composite.cls;
        this.items = [];
        this.addPlaceholderIfMissing();
        this.dirty = false;
    }

    load(value) {
        // Existing data transformation
        const isUseful = (item) => item.propagate || item.identity === "";

        this.items = value.map((data) => new Item(this, data)).filter(isUseful);
        this.dirty = false;
        this.addPlaceholderIfMissing();
    }

    dump() {
        if (!this.dirty) return undefined;
        return this.items
            .filter((item) => !item.isPlaceholder)
            .map((item) => item.dump());
    }

    get isValid() {
        if (!this.dirty) return true;
        this.validate = true;
        return this.items.every((item) => item.error === null);
    }

    markDirty() {
        this.dirty = true;
    }

    addPlaceholderIfMissing() {
        const last = this.items[this.items.length - 1];
        if (last && last.isPlaceholder) return;
        this.items.push(new Item(this));
    }
}
