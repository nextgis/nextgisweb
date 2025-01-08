import { gettext } from "@nextgisweb/pyramid/i18n";
import { html as iconHtml } from "@nextgisweb/pyramid/icon";

import type { LayerEditor } from "./../../../plugin/layer-editor/LayerEditor";

interface CreateFeatureOptions {
    layerEditor: LayerEditor;
}

export class ToolCreateFeature {
    label = gettext("Create features");
    customIcon = `
        <span class="ol-control__icon">
            ${iconHtml({ glyph: "add_box" })}
        </span>
    `;
    layerEditor: LayerEditor;

    constructor({ layerEditor }: CreateFeatureOptions) {
        this.layerEditor = layerEditor;
    }

    activate(): void {
        this.layerEditor.activateCreatingMode();
    }

    deactivate(): void {
        this.layerEditor.deactivateCreatingMode();
    }
}
