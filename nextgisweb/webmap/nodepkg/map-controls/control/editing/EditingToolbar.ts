import { Control } from "ol/control";
import type { Options } from "ol/control/Control";

import type { Display } from "@nextgisweb/webmap/display";
import "./EditingToolbar.css";

interface EditingToolbarOptions extends Options {
    tipLabel?: string;
    display: Display;
}

export class EditingToolbar extends Control {
    tipLabel?: string;
    element: HTMLElement;
    display: Display;

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
