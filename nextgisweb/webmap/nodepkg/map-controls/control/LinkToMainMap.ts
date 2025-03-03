import { Control } from "ol/control";
import type { Options as ControlOptions } from "ol/control/Control";

import { iconHtml } from "@nextgisweb/pyramid/icon";

import Icon from "@nextgisweb/icon/material/open_in_new";

interface LinkToMainMapOptions extends ControlOptions {
    tipLabel?: string;
    url: string;
}

export class LinkToMainMap extends Control {
    private url: string;

    constructor(options: LinkToMainMapOptions) {
        const element = document.createElement("div");
        element.className = "ol-control ol-unselectable";
        element.innerHTML = `
            <button>
                <span class="ol-control__icon">
                    ${iconHtml(Icon)}
                </span>
            </button>
        `;

        if (options.tipLabel) {
            element.title = options.tipLabel;
        }

        super({
            element,
            target: options.target,
        });

        this.url = options.url;

        element.addEventListener("click", () => {
            window.open(this.url, "_blank");
        });
    }
}
