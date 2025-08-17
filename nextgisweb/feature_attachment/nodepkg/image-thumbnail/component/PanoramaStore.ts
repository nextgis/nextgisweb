import type { Viewer } from "@photo-sphere-viewer/core";
import { action, observable } from "mobx";

export class PanoramaStore {
    @observable.shallow accessor viewers: Map<number, Viewer> = new Map();

    @action
    add(id: number, viewer: Viewer) {
        const viewers = new Map(this.viewers);
        viewers.set(id, viewer);
        this.viewers = viewers;
    }

    @action
    delete(id: number) {
        const viewers = new Map(this.viewers);
        viewers.delete(id);
        this.viewers = viewers;
    }
}
