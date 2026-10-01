import {
  action,
  actionBound,
  observableRef,
  observableShallow,
  observableStruct,
} from "mobx";
import type { Coordinate } from "ol/coordinate";

import type { TreeWebmapItem } from "../../layers-tree/LayersTree";
import type { PrintMapPaper, PrintMapSettings } from "../type";

import { PrintLayoutStore } from "./PrintLayoutStore";

export class PrintMapStore implements Omit<PrintMapSettings, "layout"> {
  @observableShallow accessor printMapPaper: PrintMapPaper | null = null;
  @observableShallow accessor webMapItems: TreeWebmapItem[] = [];

  @observableRef accessor width = 210;
  @observableRef accessor title: boolean | undefined = undefined;
  @observableRef accessor scale: number | undefined = undefined;
  @observableRef accessor arrow = false;
  @observableRef accessor height = 297;
  @observableRef accessor margin = 10;
  @observableRef accessor legend = false;
  @observableRef accessor scaleLine = false;
  @observableRef accessor titleText = "";
  @observableRef accessor scaleValue = false;
  @observableRef accessor legendColumns = 1;
  @observableRef accessor graticule = false;

  @observableStruct accessor center: Coordinate | undefined = undefined;

  layout: PrintLayoutStore;

  constructor(options: Partial<PrintMapSettings>) {
    this.layout = new PrintLayoutStore();
    this.update(options);
  }

  @action
  setWebMapItems(webMapItems: TreeWebmapItem[]) {
    this.webMapItems = webMapItems;
  }

  @actionBound
  update(values: Partial<PrintMapSettings>) {
    Object.keys(values).forEach((key) => {
      // @ts-expect-error class settings property access
      this[key] = values[key as keyof PrintMapSettings];
    });
  }
}
