import { Control as OlControl } from "ol/control";

import type { Display } from "../display";

import { MapToolbarItems } from "./MapToolbarItems";

import "./MapToolbar.css";

export interface MapToolbarOptions {
    display: Display;
    target?: HTMLElement;
}

export class MapToolbar extends OlControl {
    element: HTMLElement;
    items: MapToolbarItems;

    constructor({ display, target }: MapToolbarOptions) {
        const element = document.createElement("div");
        element.className = "map-toolbar";

        const items = new MapToolbarItems({
            display,
        });

        items.placeAt(element);

        super({
            element,
            target,
        });

        this.element = element;
        this.items = items;
    }
}
