import { makeAutoObservable } from "mobx";

class AnnotationsStore {
    visibleMode?: string = undefined;

    constructor() {
        makeAutoObservable(this);
    }

    setVisibleMode(visibleMode?: string): void {
        this.visibleMode = visibleMode;
    }
}

export const annotationsStore = new AnnotationsStore();
