import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";
import type { LayerEditor } from "@nextgisweb/webmap/plugin/layer-editor/LayerEditor";

import { ToolBase } from "../ToolBase";
import type { ToolBaseOptions } from "../ToolBase";

interface ModifyFeatureOptions extends ToolBaseOptions {
    layerEditor: LayerEditor;
}

export class ToolModifyFeature extends ToolBase {
    label = gettext("Modify features");
    customIcon = `
        <span class="ol-control__icon">
            ${iconHtml(EditIcon)}
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
