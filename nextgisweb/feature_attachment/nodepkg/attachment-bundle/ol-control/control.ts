import { Control } from "ol/control";
import type { Options as ControlOptions } from "ol/control/Control";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { html } from "@nextgisweb/pyramid/icon";
import type { Display } from "@nextgisweb/webmap/display";

interface LinkToMainMapOptions extends ControlOptions {
    display: Display;
    tipLabel: string;
}

export default class AttachmentBundleControl extends Control {
    private _display: Display;

    constructor(options: LinkToMainMapOptions) {
        const element = document.createElement("div");
        element.className = "ol-control ol-unselectable";
        const icon = html({ glyph: "attach_file" });
        element.innerHTML = `<button><span class="ol-control__icon">${icon}</span></button>`;
        element.title = gettext("Attachments");

        element.addEventListener("click", () => {
            this.openTab();
        });

        super({
            element,
            target: options.target,
            ...options,
        });

        this._display = options.display;
    }

    openTab() {
        const label = gettext("Attachments");
        this._display.tabsManager.addTab({
            key: "attachments",
            label,
            component: () =>
                import("@nextgisweb/feature-attachment/attachment-bundle/tab"),
            props: {
                display: this._display,
                label,
            },
        });
    }
}