import { gettext } from "@nextgisweb/pyramid/i18n";
import { html as iconHtml } from "@nextgisweb/pyramid/icon";

import { ToolBase } from "../ToolBase";
import type { ToolBaseOptions } from "../ToolBase";

import type { LayerEditor } from "./../../../plugin/layer-editor/LayerEditor";

interface ModifyFeatureOptions extends ToolBaseOptions {
    layerEditor: LayerEditor;
}

export class ToolModifyFeature extends ToolBase {
    label = gettext("Modify features");
    customIcon = `
        <span class="ol-control__icon">
            ${iconHtml({ glyph: "edit" })}
        </span>
    `;
    layerEditor: LayerEditor;

    constructor({ layerEditor, ...options }: ModifyFeatureOptions) {
        super(options);
        this.layerEditor = layerEditor;
    }

    activate(): void {
        this.layerEditor.activateModifyingMode();
    }

    deactivate(): void {
        this.layerEditor.deactivateModifyingMode();
    }
}
