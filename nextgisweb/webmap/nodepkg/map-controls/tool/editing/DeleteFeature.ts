import { gettext } from "@nextgisweb/pyramid/i18n";
import { html as iconHtml } from "@nextgisweb/pyramid/icon";

import type { LayerEditor } from "./../../../plugin/layer-editor/LayerEditor";

interface DeleteFeatureOptions {
    layerEditor: LayerEditor;
}

export class ToolDeleteFeature {
    label = gettext("Delete features");
    customIcon = `
        <span class="ol-control__icon">
            ${iconHtml({ glyph: "delete" })}
        </span>
    `;
    layerEditor: LayerEditor;

    constructor({ layerEditor }: DeleteFeatureOptions) {
        this.layerEditor = layerEditor;
    }

    activate(): void {
        this.layerEditor.activateDeletingMode();
    }

    deactivate(): void {
        this.layerEditor.deactivateDeletingMode();
    }
}
