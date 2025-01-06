import type ShadowDisplay from "@nextgisweb/webmap/compat/ShadowDisplay";

export abstract class Base {
    display: ShadowDisplay;
    label = "Tool";

    constructor({
        display,
        label,
    }: {
        display: ShadowDisplay;
        label?: string;
    }) {
        this.display = display;
        if (label) {
            this.label = label;
        }
    }

    activate() {}

    deactivate() {}
}
