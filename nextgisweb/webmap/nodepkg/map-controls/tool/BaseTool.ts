import type { DojoDisplay } from "@nextgisweb/webmap/type";

export abstract class Base {
    display: DojoDisplay;
    label = "Tool";

    constructor({ display, label }: { display: DojoDisplay; label?: string }) {
        this.display = display;
        if (label) {
            this.label = label;
        }
    }

    activate() {}

    deactivate() {}
}
