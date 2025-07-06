import { action, computed, observable } from "mobx";

import type { EdiTableStore } from "@nextgisweb/gui/edi-table";
import type { ACLRule, ResourceCls } from "@nextgisweb/resource/type/api";

import { PermissionStoreItem as Item } from "./PermissionStoreItem";

interface Composite {
    cls: ResourceCls;
}

export class PermissionsStore implements EdiTableStore<Item> {
    readonly identity = "resource.permissions";

    @observable.shallow accessor items: Item[] = [];
    @observable.ref accessor dirty = false;

    readonly resourceClass: ResourceCls;

    constructor({ composite }: { composite: Composite }) {
        this.resourceClass = composite.cls;
        this.items = [];

        this.rotatePlaceholder();
    }

    @action
    load(value: ACLRule[]) {
        // Existing data transformation
        const isUseful = (item: Item) => item.propagate || item.identity === "";

        this.items = value.map((data) => new Item(this, data)).filter(isUseful);
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        return this.items.map((item) => item.dump());
    }

    @computed
    get isValid() {
        if (!this.dirty) return true;
        return this.items.every((item) => item.error === null);
    }

    @computed
    get counter() {
        return this.items.length;
    }

    // EdiTable

    @observable.ref accessor validate = false;
    @observable.ref accessor placeholder: Item | null = null;

    @computed
    get rows() {
        return this.items;
    }

    @action
    rotatePlaceholder() {
        if (this.placeholder && this.placeholder.action === null) return;
        if (this.placeholder) {
            this.items.push(this.placeholder);
        }
        this.placeholder = new Item(this);
    }

    @action
    deleteRow(row: Item) {
        this.items.splice(this.items.indexOf(row), 1);
        this.dirty = true;
    }

    @action
    cloneRow(row: Item) {
        const idx = this.items.indexOf(row);
        this.items.splice(idx + 1, 0, new Item(this, row.dump()));
        this.dirty = true;
    }
}
