import { action, computed, observable, observe, runInAction } from "mobx";

import type * as apitype from "@nextgisweb/basemap/type/api";
import type { FocusTableStore } from "@nextgisweb/gui/focus-table";
import type { CompositeStore } from "@nextgisweb/resource/composite/CompositeStore";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";

import { Basemap } from "./Basemap";

type Value = apitype.BasemapWebMapRead;

export class WebMapStore
    implements EditorStore<Value>, FocusTableStore<Basemap>
{
    readonly identity = "basemap_webmap";

    @observable accessor dirty = false;
    @observable accessor validate = false;

    basemaps = observable.array<Basemap>([], { deep: false });

    composite: CompositeStore;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
        observe(this.basemaps, () => this.markDirty());
    }

    @action load({ basemaps }: Value) {
        this.basemaps.replace(basemaps.map((v) => new Basemap(this, v)));
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined;
        return { basemaps: this.basemaps.map((i) => i.json()) };
    }

    @action markDirty() {
        this.dirty = true;
    }

    @computed get isValid(): boolean {
        runInAction(() => {
            this.validate = true;
        });
        return this.basemaps.every((i) => i.error === false);
    }

    // FocusTableStore

    getItemChildren(item: Basemap | null) {
        return item === null ? this.basemaps : undefined;
    }

    getItemContainer(item: Basemap) {
        return item && this.basemaps;
    }

    getItemParent() {
        return null;
    }

    getItemError(item: Basemap) {
        return item.error;
    }
}
