import { action, computed, observable } from "mobx";

import type { NullableProps } from "@nextgisweb/gui/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resources, scopes } from "@nextgisweb/resource/blueprint";
import type {
    ACLRule,
    ACLRuleAction,
    ResourceCls,
} from "@nextgisweb/resource/type/api";

import type { PermissionsStore } from "./PermissionsStore";

const msgAllRequired = gettext("All fields are required");
const msgConflict = gettext("Row conflicts with another");

const resourceScopes = (i: ResourceCls) => resources[i].scopes;
const baseClasses = (i: ResourceCls) => resources[i].base_classes;

const isSameOrSubclass = (child: ResourceCls, parent: ResourceCls) =>
    child === parent || baseClasses(child).includes(parent);

let keySeq = 0;

export class PermissionStoreItem {
    @observable.ref accessor action: ACLRuleAction | null = null;
    @observable.ref accessor principal: number | null = null;
    @observable.ref accessor scope: string | null = null;
    @observable.ref accessor permission: string | null = null;
    @observable.ref accessor identity: ResourceCls | "" | null = null;
    @observable.ref accessor propagate: boolean | null = null;

    readonly store: PermissionsStore;
    readonly key: number;

    constructor(store: PermissionsStore, data?: NullableProps<ACLRule>) {
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

    dump(): ACLRule {
        return {
            action: this.action,
            principal: { id: this.principal },
            scope: this.scope,
            permission: this.permission,
            identity: this.identity,
            propagate: this.propagate,
        } as ACLRule;
    }

    @computed
    get scopes() {
        if (this.identity) {
            return resourceScopes(this.identity);
        } else if (this.propagate === false) {
            return resourceScopes(this.store.resourceClass);
        } else if (this.propagate === true) {
            return Object.keys(scopes);
        }
        return resourceScopes("resource");
    }

    @computed
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

    @action
    update(data: Partial<ACLRule>) {
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
        this.store.dirty = true;

        this.store.rotatePlaceholder();
    }
}
