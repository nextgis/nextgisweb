import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";

import { ToolBase } from "../ToolBase";
import type { ToolBaseOptions } from "../ToolBase";

import type { LayerEditor } from "./../../../plugin/layer-editor/LayerEditor";

import Icon from "@nextgisweb/icon/material/add_box";

interface CreateFeatureOptions extends ToolBaseOptions {
    layerEditor: LayerEditor;
}

export class ToolCreateFeature extends ToolBase {
    label = gettext("Create features");
    customIcon = `
        <span class="ol-control__icon">
            ${iconHtml(Icon)}
        </span>
    `;
    layerEditor: LayerEditor;

    constructor({ layerEditor, ...options }: CreateFeatureOptions) {
        super(options);
        this.layerEditor = layerEditor;
    }

    activate(): void {
        this.layerEditor.activateCreatingMode();
    }

    deactivate(): void {
        this.layerEditor.deactivateCreatingMode();
    }
}
