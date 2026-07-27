import { action, computed, observable, observe } from "mobx";

import type {
  BasemapWebMapRead,
  BasemapWebMapUpdate,
} from "@nextgisweb/basemap/type/api";
import { mapper } from "@nextgisweb/gui/arm";
import type { FocusTableStore } from "@nextgisweb/gui/focus-table";
import type { CompositeStore } from "@nextgisweb/resource/composite/CompositeStore";
import type {
  EditorStore,
  EditorStoreOptions,
} from "@nextgisweb/resource/type";

import { Basemap } from "./Basemap";

const {
  background_color: backgroundColor,
  disable,
  $load: mapperLoad,
  $dump: mapperDump,
  $error: mapperError,
} = mapper<WebMapStore, BasemapWebMapRead>({
  validateIf: (o) => o.validate,
  onChange: (o) => o.markDirty(),
});

export class WebMapStore
  implements
    EditorStore<BasemapWebMapRead, BasemapWebMapUpdate>,
    FocusTableStore<Basemap>
{
  readonly identity = "basemap_webmap";
  readonly composite: CompositeStore;

  @observable.ref accessor dirty = false;
  @observable.ref accessor validate = false;

  readonly basemaps = observable.array<Basemap>([], { deep: false });
  readonly backgroundColor = backgroundColor.init(null, this);
  readonly disable = disable.init(false, this);

  constructor({ composite }: EditorStoreOptions) {
    this.composite = composite;
    observe(this.basemaps, () => this.markDirty());
  }

  @action
  load(value: BasemapWebMapRead) {
    this.basemaps.replace(value.basemaps.map((v) => new Basemap(this, v)));
    mapperLoad(this, value);
    this.dirty = false;
  }

  dump() {
    if (!this.dirty) return undefined;
    return {
      basemaps: this.basemaps.map((i) => i.json()),
      ...mapperDump(this),
    } as BasemapWebMapUpdate;
  }

  @action
  markDirty() {
    this.dirty = true;
  }

  @computed
  get isValid(): boolean {
    return (
      this.basemaps.every((i) => i.error === false) &&
      mapperError(this) === false
    );
  }

  @computed
  get counter() {
    return this.basemaps.length;
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
