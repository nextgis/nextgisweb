import { Control } from "ol/control";

import { html as htmlIcon } from "@nextgisweb/pyramid/icon";
import type { Display } from "@nextgisweb/webmap/display";

interface HomeControlOptions {
    target?: HTMLElement;
    tipLabel?: string;
    display: Display;
}

export class InitialExtent extends Control {
    private display: Display;

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
