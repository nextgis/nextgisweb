import { DeleteIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";
import type { LayerEditor } from "@nextgisweb/webmap/plugin/layer-editor/LayerEditor";

import { ToolBase } from "../ToolBase";
import type { ToolBaseOptions } from "../ToolBase";

interface DeleteFeatureOptions extends ToolBaseOptions {
    layerEditor: LayerEditor;
}

export class ToolDeleteFeature extends ToolBase {
    label = gettext("Delete features");
    customIcon = `
        <span class="ol-control__icon">
            ${iconHtml(DeleteIcon)}
        </span>
    `;
    layerEditor: LayerEditor;

    constructor({ display, ...options }: DeleteFeatureOptions) {
        super({ display });
        this.layerEditor = options.layerEditor;
    }

    activate(): void {
        this.layerEditor.activateDeletingMode();
    }

    deactivate(): void {
        this.layerEditor.deactivateDeletingMode();
    }
}
