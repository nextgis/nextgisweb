import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!feature_attachment";
import type { DojoDisplay, PluginParams } from "@nextgisweb/webmap/type";

import AttachmentBundleControl from "../ol-control";

class BundleAttachmentPlugin {
    private _display: DojoDisplay;

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
            // @ts-expect-error ts-missing
            this._display._mapDeferred.then(() => {
                this.buildControl();
            });
        }
    }

    startup() {}
    postCreate() {}
}

export default BundleAttachmentPlugin;
