import settings from "@nextgisweb/feature-attachment/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import type { PluginParams } from "@nextgisweb/webmap/type";

import AttachmentBundleControl from "../ol-control";

class BundleAttachmentPlugin {
    private _display: Display;

    private buildControl() {
        this._display._mapAddControls([
            new AttachmentBundleControl({
                display: this._display,
                target: this._display.leftBottomControlPane,
                tipLabel: gettext("Attachments"),
            }),
        ]);
    }

    constructor(params: PluginParams) {
        this._display = params.display;
        if (settings["webmap"]["bundle"]) {
            this._display.mapDeferred.then(() => {
                this.buildControl();
            });
        }
    }

    startup() {}
    postCreate() {}
}

export default BundleAttachmentPlugin;
