import { makeAutoObservable } from "mobx";

import type { EdiTableStore } from "@nextgisweb/gui/edi-table";

import type { ResourcePermission } from "../type";

import { PermissionStoreItem as Item } from "./PermissionStoreItem";

interface Composite {
    cls: string;
}

export class PermissionsStore implements EdiTableStore<Item> {
    identity = "resource.permissions";

    items: Item[] = [];
    dirty = false;

    readonly resourceClass: string;

    constructor({ composite }: { composite: Composite }) {
        makeAutoObservable(this, { identity: false });
        this.resourceClass = composite.cls;
        this.items = [];

        this.rotatePlaceholder();
    }

    load(value: ResourcePermission[]) {
        // Existing data transformation
        const isUseful = (item: Item) => item.propagate || item.identity === "";

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
    placeholder: Item | null = null;

    get rows() {
        return this.items;
    }

    rotatePlaceholder() {
        if (this.placeholder && this.placeholder.action === null) return;
        this.placeholder && this.items.push(this.placeholder);
        this.placeholder = new Item(this);
    }

    deleteRow(row: Item) {
        this.items.splice(this.items.indexOf(row), 1);
        this.dirty = true;
    }

    cloneRow(row: Item) {
        const idx = this.items.indexOf(row);
        this.items.splice(idx + 1, 0, new Item(this, row.dump()));
        this.dirty = true;
    }
}
