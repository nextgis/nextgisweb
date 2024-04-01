import { Control } from "ol/control";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { html } from "@nextgisweb/pyramid/icon";

export default class AttachmentBundleControl extends Control {
    _display;

    constructor(options) {
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
        this._display.tabContainer.addTab({
            key: "attachments",
            label,
            component: () =>
                new Promise((resolve) => {
                    require([
                        "@nextgisweb/feature-attachment/attachment-bundle/tab",
                    ], (module) => {
                        resolve(module);
                    });
                }),
            props: {
                display: this._display,
                label,
            },
        });
    }
}
