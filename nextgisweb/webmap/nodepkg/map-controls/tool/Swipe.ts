import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";
import { layoutStore } from "@nextgisweb/pyramid/layout";
import type { Display } from "@nextgisweb/webmap/display";

import { Swipe } from "../control/SwipeControl";

import { ToolBase } from "./ToolBase";

import Icon from "@nextgisweb/icon/material/compare";

// prettier-ignore
const msg = {
    noLayerSelectedContent: gettext("Please select a layer before using this tool."),
    noLayerSelectedTitle: gettext("No layer selected"),
    invalidTypeContent: gettext("Please select a layer, not a group."),
    layerHiddenContent: gettext("Please make the layer visible before using this tool."),
    invalidTypeTitle: gettext("Invalid selection type"),
    layerHiddenTitle: gettext("Layer is not visible"),
};

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

    validate(status: boolean): boolean {
        const itemConfig = this.display.itemConfig;
        if (status) {
            if (!itemConfig) {
                layoutStore.modal?.info({
                    title: msg.noLayerSelectedTitle,
                    content: msg.noLayerSelectedContent,
                });
                return false;
            } else {
                if (itemConfig.type !== "layer") {
                    layoutStore.modal?.info({
                        title: msg.invalidTypeTitle,
                        content: msg.invalidTypeContent,
                    });
                    return false;
                }
                const layer = this.display.map.layers[itemConfig.id];
                if (layer) {
                    if (!layer.visibility) {
                        layoutStore.modal?.info({
                            title: msg.layerHiddenTitle,
                            content: msg.layerHiddenContent,
                        });
                        return false;
                    }
                }
            }
        }
        return true;
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
