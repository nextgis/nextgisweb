import { action, computed, observable, observe } from "mobx";

import type * as apitype from "@nextgisweb/basemap/type/api";
import type { FocusTableStore } from "@nextgisweb/gui/focus-table";
import type { EditorStore } from "@nextgisweb/resource/type/EditorStore";

import { Basemap } from "./Basemap";

type Value = apitype.BasemapWebMapRead;

export class WebMapStore
    implements EditorStore<Value>, FocusTableStore<Basemap>
{
    readonly identity = "basemap_webmap";

    @observable accessor dirty = false;
    @observable accessor validate = false;

    basemaps = observable.array<Basemap>([], { deep: false });

    constructor() {
        observe(this.basemaps, () => this.markDirty());
    }

    @action load({ basemaps }: Value) {
        this.basemaps.replace(basemaps.map((v) => new Basemap(this, v)));
        this.dirty = false;
    }

    dump() {
        if (!this.dirty) return undefined as unknown as Value;
        return { basemaps: this.basemaps.map((i) => i.json()) };
    }

    @action markDirty() {
        this.dirty = true;
    }

    @computed get isValid(): boolean {
        this.validate = true;
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
