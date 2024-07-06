import { action, computed, observable, observe } from "mobx";

import type { FocusTableStore } from "@nextgisweb/gui/focus-table";
import type * as apitype from "@nextgisweb/ogcfserver/type/api";
import type { EditorStore } from "@nextgisweb/resource/type/EditorStore";

import { Collection } from "./Collection";

export interface Value {
    collections: apitype.OGCFServerCollection[];
}

export class ServiceStore
    implements EditorStore<Value>, FocusTableStore<Collection>
{
    readonly identity = "ogcfserver_service";

    @observable accessor dirty = false;
    @observable accessor validate = false;

    collections = observable.array<Collection>([]);

    constructor() {
        observe(this.collections, () => this.markDirty());
    }

    @action load({ collections }: Value) {
        this.collections.replace(
            collections.map((v) => new Collection(this, v))
        );
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined as unknown as Value;
        return { collections: this.collections.map((i) => i.json()) };
    }

    @action markDirty() {
        this.dirty = true;
    }

    @computed get isValid(): boolean {
        this.validate = true;
        return this.collections.every((i) => i.error === false);
    }

    // FocusTableStore

    getItemChildren(item: Collection | null) {
        return item === null ? this.collections : undefined;
    }

    getItemContainer(item: Collection) {
        return item && this.collections;
    }

    getItemParent() {
        return null;
    }

    getItemError(item: Collection) {
        return item.error;
    }
}
