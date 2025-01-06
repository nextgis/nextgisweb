import { gettext } from "@nextgisweb/pyramid/i18n";
import { html as htmlIcon } from "@nextgisweb/pyramid/icon";
import type { DojoDisplay } from "@nextgisweb/webmap/type";

import { Swipe } from "../control/SwipeControl";

import { Base } from "./ToolBase";

export class ToolSwipe extends Base {
    orientation: "vertical" | "horizontal";

    customIcon?: string;
    iconClass?: string;

    private control: Swipe;

    constructor({
        display,
        orientation = "horizontal",
    }: {
        display: DojoDisplay;
        orientation: "vertical" | "horizontal";
    }) {
        super({ display });

        this.orientation = orientation;
        if (this.orientation === "vertical") {
            this.label = gettext("Vertical swipe");
            this.customIcon =
                '<span class="ol-control__icon">' +
                htmlIcon({ glyph: "compare" }) +
                "</span>";
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

        const itemConfig = this.display.get("itemConfig");
        if (itemConfig && itemConfig.type === "layer") {
            const layer = this.display.map.layers[itemConfig.id]?.olLayer;
            if (layer) {
                this.control.addLayers([layer]);
            }
        }
    }
}
