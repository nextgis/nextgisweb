import { Control } from "ol/control";

import type { DojoDisplay } from "@nextgisweb/webmap/type";

interface ScaleControlOptions {
    target?: HTMLElement;
    display: DojoDisplay;
}

export class InfoScale extends Control {
    private display: DojoDisplay;

    constructor({ display, target }: ScaleControlOptions) {
        const element = document.createElement("span");
        element.className = "ol-control ol-scaleInfo ol-unselectable";

        super({
            element,
            target,
        });

        this.display = display;

        this.display.map.watch("resolution", (_attr, _oldVal, newVal) => {
            this.updateScale(newVal);
        });
    }

    private updateScale(val: number): void {
        const view = this.display.map.olMap.getView();
        const projection = view.getProjection();

        const scale = this.display.map.getScaleForResolution(
            val,
            projection.getMetersPerUnit() || 1
        );

        this.element.innerHTML = `1 : ${Math.round(scale)}`;
    }
}
