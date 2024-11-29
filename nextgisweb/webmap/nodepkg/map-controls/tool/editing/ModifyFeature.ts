import { gettext } from "@nextgisweb/pyramid/i18n";
import { html as iconHtml } from "@nextgisweb/pyramid/icon";

import type { LayerEditor } from "./../../../plugin/layer-editor/LayerEditor";

interface ModifyFeatureOptions {
    layerEditor: LayerEditor;
}

export class ToolModifyFeature {
    label = gettext("Modify features");
    customIcon = `
        <span class="ol-control__icon">
            ${iconHtml({ glyph: "edit" })}
        </span>
    `;
    layerEditor: LayerEditor;

    constructor({ layerEditor }: ModifyFeatureOptions) {
        this.layerEditor = layerEditor;
    }

    activate(): void {
        this.layerEditor.activateModifyingMode();
    }

    deactivate(): void {
        this.layerEditor.deactivateModifyingMode();
    }
}
