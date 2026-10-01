import { action, observableRef } from "mobx";

export class DescriptionEditorStore {
  readonly identity = "resource.description";

  @observableRef accessor value: string | null = null;
  @observableRef accessor loaded: string | null = null;
  @observableRef accessor dirty: boolean = false;

  @action
  setValue(value: string | null) {
    this.value = value;
    this.dirty = this.value !== this.loaded;
  }

  @action
  load(value: string) {
    this.value = this.loaded = value;
    this.dirty = false;
  }

  dump() {
    if (this.value === this.loaded) return undefined;
    return this.value;
  }

  get isValid() {
    return true;
  }
}
