import { Control } from "ol/control";

import { html as htmlIcon } from "@nextgisweb/pyramid/icon";
import type { DojoDisplay } from "@nextgisweb/webmap/type";

interface HomeControlOptions {
    target?: HTMLElement;
    tipLabel?: string;
    display: DojoDisplay;
}

export class InitialExtent extends Control {
    private display: DojoDisplay;

    constructor({ target, display, tipLabel }: HomeControlOptions) {
        const element = document.createElement("div");
        element.className = "ol-control ol-unselectable";

        const button = document.createElement("button");
        const iconSpan = document.createElement("span");
        iconSpan.className = "ol-control__icon";

        iconSpan.innerHTML = htmlIcon({ glyph: "home" });

        button.appendChild(iconSpan);
        element.appendChild(button);

        if (tipLabel) {
            element.title = tipLabel;
        }

        super({
            element,
            target,
        });

        this.display = display;

        element.addEventListener("click", () => {
            this.display._zoomToInitialExtent();
        });
    }
}