import { Control } from "ol/control";
import type { Options as ControlOptions } from "ol/control/Control";

import { html as htmlIcon } from "@nextgisweb/pyramid/icon";

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
                    ${htmlIcon({ glyph: "open_in_new" })}
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
