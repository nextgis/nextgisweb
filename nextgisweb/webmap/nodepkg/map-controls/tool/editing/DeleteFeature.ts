import { gettext } from "@nextgisweb/pyramid/i18n";
import { html as iconHtml } from "@nextgisweb/pyramid/icon";

import { ToolBase } from "../ToolBase";
import type { ToolBaseOptions } from "../ToolBase";

import type { LayerEditor } from "./../../../plugin/layer-editor/LayerEditor";

interface DeleteFeatureOptions extends ToolBaseOptions {
    layerEditor: LayerEditor;
}

export class ToolDeleteFeature extends ToolBase {
    label = gettext("Delete features");
    customIcon = `
        <span class="ol-control__icon">
            ${iconHtml({ glyph: "delete" })}
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
