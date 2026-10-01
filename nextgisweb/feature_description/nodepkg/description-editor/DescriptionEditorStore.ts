import { action, actionBound, computed, observableRef } from "mobx";

import type { EditorStore as IEditorStore } from "@nextgisweb/feature-layer/type";

type Value = string | null;

class EditorStore implements IEditorStore<Value> {
  @observableRef private accessor _value: Value = null;
  @observableRef private accessor _initValue: Value = null;

  @computed
  get dirty() {
    return this.value !== this._initValue;
  }

  @computed
  get value(): Value {
    return this._value;
  }

  @action
  update(value: Value) {
    this._value = value;
  }

  @actionBound
  load(value: Value) {
    this._value = value;
    this._initValue = value;
  }

  @actionBound
  reset() {
    this.load(this._initValue);
  }
}

export default EditorStore;
