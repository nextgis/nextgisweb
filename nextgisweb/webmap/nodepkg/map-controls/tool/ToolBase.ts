import type ShadowDisplay from "@nextgisweb/webmap/compat/ShadowDisplay";
import type { ToggleControl } from "@nextgisweb/webmap/map-toolbar/ToggleControl";

export interface ToolBaseOptions {
    display: ShadowDisplay;
    label?: string;
}

export abstract class ToolBase {
    display: ShadowDisplay;
    label = "Tool";

    iconClass?: string;
    customCssClass?: string;
    customIcon?: string;
    toolbarBtn?: ToggleControl;

    constructor({ display, label }: ToolBaseOptions) {
        this.display = display;
        if (label) {
            this.label = label;
        }
    }

    activate() {}

    deactivate() {}

    destroy?(): void;
}
