import { always } from "ol/events/condition";
import { DragZoom } from "ol/interaction";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";
import type { Display } from "@nextgisweb/webmap/display";

import { ToolBase } from "./ToolBase";

import ZoomInIcon from "@nextgisweb/icon/material/zoom_in";
import ZoomOutIcon from "@nextgisweb/icon/material/zoom_out";

import "./Zoom.css";

interface ZoomOptions {
    display: Display;
    out?: boolean;
}

export class ToolZoom extends ToolBase {
    out: boolean;
    customIcon: string;
    private readonly interaction: DragZoom;

    constructor({ display, out = false }: ZoomOptions) {
        super({ display });
        this.out = out;

        this.label = this.out ? gettext("Zoom out") : gettext("Zoom in");
        this.customIcon = `
            <span class="ol-control__icon">
                ${iconHtml(this.out ? ZoomOutIcon : ZoomInIcon)}
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
        this.display.map.olMap.getTargetElement().style.cursor = this.out
            ? "zoom-out"
            : "zoom-in";
    }

    deactivate() {
        this.interaction.setActive(false);
        this.display.map.olMap.getTargetElement().style.cursor = "auto";
    }
}
