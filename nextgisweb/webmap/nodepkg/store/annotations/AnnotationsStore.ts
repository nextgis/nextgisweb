import { action, observable } from "mobx";

export type VisibleMode = "no" | "yes" | "messages";

class AnnotationsStore {
    @observable accessor visibleMode: VisibleMode | null = null;

    @action
    setVisibleMode(visibleMode: VisibleMode | null): void {
        this.visibleMode = visibleMode;
    }
}

export const annotationsStore = new AnnotationsStore();
