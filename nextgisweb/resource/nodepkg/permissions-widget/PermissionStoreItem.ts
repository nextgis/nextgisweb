import { makeAutoObservable, toJS } from "mobx";

import blueprint from "@nextgisweb/pyramid/api/load!/api/component/resource/blueprint";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ResourcePermission } from "../type";

import type { PermissionsStore } from "./PermissionsStore";

const msgAllRequired = gettext("All fields are required");
const msgConflict = gettext("Row conflicts with another");

const resourceScopes = (i: string) => blueprint.resources[i].scopes;
const resourceBaseClasses = (i: string) => blueprint.resources[i].base_classes;

const isSameOrSubclass = (child: string, parent: string) =>
    child === parent || resourceBaseClasses(child).includes(parent);

let keySeq = 0;

export class PermissionStoreItem {
    action: string | null = null;
    principal: number | null = null;
    scope: string | null = null;
    permission: string | null = null;
    identity: string | null = null;
    propagate: boolean | null = null;

    readonly store: PermissionsStore;
    readonly key: number;

    constructor(store: PermissionsStore, data?: ResourcePermission) {
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

    dump(): ResourcePermission {
        return toJS<ResourcePermission>({
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

    update(data: Partial<ResourcePermission>) {
        for (const [k, v] of Object.entries(data)) {
            Object.assign(this, { [k]: v });
        }

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
