import { Control } from "ol/control";
import type { Options } from "ol/control/Control";

import "./EditingToolbar.css";
import type { ShadowDisplay } from "@nextgisweb/webmap/type";

interface EditingToolbarOptions extends Options {
    tipLabel?: string;
    display: ShadowDisplay;
}

export class EditingToolbar extends Control {
    tipLabel?: string;
    element: HTMLElement;
    display: ShadowDisplay;

    constructor({ target, display, tipLabel }: EditingToolbarOptions) {
        const element = document.createElement("div");
        element.className = "edit-toolbar ol-hidden";
        element.innerHTML = "";

        super({
            element,
            target,
        });
        this.display = display;
        this.element = element;
        this.tipLabel = tipLabel;
    }
}
