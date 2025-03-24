import { action, observable } from "mobx";

export type AnnotationVisibleMode = "no" | "yes" | "messages";

class AnnotationsStore {
    @observable.ref accessor visibleMode: AnnotationVisibleMode | null = null;

    @action
    setVisibleMode(visibleMode: AnnotationVisibleMode | null): void {
        this.visibleMode = visibleMode;
    }
}

export const annotationsStore = new AnnotationsStore();
