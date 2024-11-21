import { always } from "ol/events/condition";
import { DragZoom } from "ol/interaction";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { html as iconHtml } from "@nextgisweb/pyramid/icon";
import type { DojoDisplay } from "@nextgisweb/webmap/type";

import { Base } from "./Base";
import "./Zoom.css";

interface ZoomOptions {
    display: DojoDisplay;
    out?: boolean;
}

export class ToolZoom extends Base {
    out: boolean;
    customIcon: string;
    private readonly interaction: DragZoom;

    constructor({ display, out = false }: ZoomOptions) {
        super({ display });
        this.out = out;

        this.label = this.out ? gettext("Zoom out") : gettext("Zoom in");
        this.customIcon = `
            <span class="ol-control__icon">
                ${iconHtml({ glyph: this.out ? "zoom_out" : "zoom_in" })}
            </span>
        `;

        this.interaction = new DragZoom({
            condition: always,
            out: this.out,
        });

        this.deactivate();
        this.display.map.olMap.addInteraction(this.interaction);
    }

    activate() {
        this.interaction.setActive(true);
        this.display.mapContainer.domNode.style.cursor = this.out
            ? "zoom-out"
            : "zoom-in";
    }

    deactivate() {
        this.interaction.setActive(false);
        this.display.mapContainer.domNode.style.cursor = "auto";
    }
}
