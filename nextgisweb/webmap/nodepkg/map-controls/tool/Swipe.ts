import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";
import type { Display } from "@nextgisweb/webmap/display";

import { Swipe } from "../control/SwipeControl";

import { ToolBase } from "./ToolBase";

import Icon from "@nextgisweb/icon/material/compare";

export class ToolSwipe extends ToolBase {
    orientation: "vertical" | "horizontal";

    customIcon?: string;
    iconClass?: string;

    private control: Swipe;

    constructor({
        display,
        orientation = "horizontal",
    }: {
        display: Display;
        orientation: "vertical" | "horizontal";
    }) {
        super({ display });

        this.orientation = orientation;
        if (this.orientation === "vertical") {
            this.label = gettext("Vertical swipe");
            this.customIcon = `<span class="ol-control__icon">${iconHtml(Icon)}</span>`;
        } else {
            this.orientation = "horizontal";
            this.label = gettext("Horizontal swipe");
            this.iconClass = "iconSwipeHorizontal";
        }

        this.control = new Swipe({ orientation: this.orientation });

        this.updateControlLayers();
    }

    activate() {
        this.display.map.olMap.addControl(this.control);
        this.updateControlLayers();
    }

    deactivate() {
        this.display.map.olMap.removeControl(this.control);
    }

    private updateControlLayers() {
        this.control.removeLayers(this.control.layers);

        const itemConfig = this.display.itemConfig;
        if (itemConfig && itemConfig.type === "layer") {
            const layer = this.display.map.layers[itemConfig.id]?.olLayer;
            if (layer) {
                this.control.addLayers([layer]);
            }
        }
    }
}
