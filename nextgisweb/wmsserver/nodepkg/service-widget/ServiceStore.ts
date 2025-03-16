import { action, computed, observable, observe, runInAction } from "mobx";

import type { FocusTableStore } from "@nextgisweb/gui/focus-table";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type * as apitype from "@nextgisweb/wmsserver/type/api";

import { Layer } from "./Layer";

export interface Value {
    layers: apitype.WMSServiceLayer[];
}

export class ServiceStore
    implements EditorStore<Value>, FocusTableStore<Layer>
{
    readonly identity = "wmsserver_service";

    @observable accessor dirty = false;
    @observable accessor validate = false;

    layers = observable.array<Layer>([], { deep: false });

    composite: CompositeStore;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
        observe(this.layers, () => this.markDirty());
    }

    @action
    load({ layers }: Value) {
        this.layers.replace(layers.map((v) => new Layer(this, v)));
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        return { layers: this.layers.map((i) => i.json()) };
    }

    @action
    markDirty() {
        this.dirty = true;
    }

    @computed
    get isValid(): boolean {
        runInAction(() => {
            this.validate = true;
        });
        return this.layers.every((i) => i.error === false);
    }

    @computed
    get counter() {
        return this.layers.length;
    }

    // FocusTableStore

    getItemChildren(item: Layer | null) {
        return item === null ? this.layers : undefined;
    }

    getItemContainer(item: Layer) {
        return item && this.layers;
    }

    getItemParent() {
        return null;
    }

    getItemError(item: Layer) {
        return item.error;
    }
}
