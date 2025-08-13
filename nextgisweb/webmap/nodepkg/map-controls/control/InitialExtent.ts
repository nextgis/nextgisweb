import { Control } from "ol/control";

import { iconHtml } from "@nextgisweb/pyramid/icon";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import Icon from "@nextgisweb/icon/material/home";

interface HomeControlOptions {
    target?: HTMLElement;
    tipLabel?: string;
    map: MapStore;
}

export class InitialExtent extends Control {
    private map: MapStore;

    constructor({ target, map, tipLabel }: HomeControlOptions) {
        const element = document.createElement("div");
        element.className = "ol-control ol-unselectable";

        const button = document.createElement("button");
        const iconSpan = document.createElement("span");
        iconSpan.className = "ol-control__icon";

        iconSpan.innerHTML = iconHtml(Icon);

        button.appendChild(iconSpan);
        element.appendChild(button);

        if (tipLabel) {
            element.title = tipLabel;
        }

        super({
            element,
            target,
        });

        this.map = map;

        element.addEventListener("click", () => {
            this.map.zoomToInitialExtent();
        });
    }
}
