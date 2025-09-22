import { action, observable } from "mobx";
import type { Coordinate } from "ol/coordinate";

import type { TreeWebmapItem } from "../../layers-tree/LayersTree";
import type { PrintMapPaper, PrintMapSettings } from "../type";

import { PrintLayoutStore } from "./PrintLayoutStore";

export class PrintMapStore implements PrintMapSettings {
    @observable.shallow accessor printMapPaper: PrintMapPaper | null = null;
    @observable.shallow accessor webMapItems: TreeWebmapItem[] = [];

    @observable.ref accessor width = 210;
    @observable.ref accessor title: boolean | undefined = undefined;
    @observable.ref accessor scale: number | undefined = undefined;
    @observable.ref accessor arrow = false;
    @observable.ref accessor height = 297;
    @observable.ref accessor margin = 10;
    @observable.ref accessor legend = false;
    @observable.ref accessor scaleLine = false;
    @observable.ref accessor titleText = "";
    @observable.ref accessor scaleValue = false;
    @observable.ref accessor legendColumns = 1;
    @observable.ref accessor graticule = false;

    @observable.struct accessor center: Coordinate | undefined = undefined;

    layout: PrintLayoutStore;

    constructor(options: Partial<PrintMapSettings>) {
        this.layout = new PrintLayoutStore();
        this.update(options);
    }

    @action
    setWebMapItems(webMapItems: TreeWebmapItem[]) {
        this.webMapItems = webMapItems;
    }

    @action.bound
    update(values: Partial<PrintMapSettings>) {
        Object.keys(values).forEach((key) => {
            // @ts-expect-error class settings property access
            this[key] = values[key as keyof PrintMapSettings];
        });
    }
}
