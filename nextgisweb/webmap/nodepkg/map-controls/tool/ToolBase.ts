import type { Display } from "@nextgisweb/webmap/display";
import type { ToggleControl } from "@nextgisweb/webmap/map-toolbar/ToggleControl";

export interface ToolBaseOptions {
    display: Display;
    label?: string;
}

export abstract class ToolBase {
    display: Display;
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

    validate?(status: boolean): boolean;
}
