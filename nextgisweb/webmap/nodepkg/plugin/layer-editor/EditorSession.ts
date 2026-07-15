import { action, computed, observable } from "mobx";
import VectorSource from "ol/source/Vector";

import type { UndoAction } from "./type";

export interface EditorSessionOptions {
  source?: VectorSource;
  id?: string | number;
}

function once(fn: UndoAction): UndoAction {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    fn();
  };
}

export class EditorSession {
  readonly source: VectorSource;
  @observable.ref accessor id: string | number | undefined;
  @observable.shallow accessor undo: UndoAction[] = [];

  constructor({ source = new VectorSource(), id }: EditorSessionOptions = {}) {
    this.source = source;
    this.id = id;
  }

  @computed
  get dirty() {
    return this.undo.length > 0;
  }

  @action.bound
  addUndo(fn: UndoAction) {
    this.undo.push(once(fn));
  }

  @action.bound
  undoLast() {
    const toUndo = this.undo.pop();
    setTimeout(() => toUndo?.());
  }
}
