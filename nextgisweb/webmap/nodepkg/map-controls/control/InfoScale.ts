import { Control } from "ol/control";

import type { ShadowDisplay } from "@nextgisweb/webmap/type";

interface ScaleControlOptions {
    target?: HTMLElement;
    display: ShadowDisplay;
}

export class InfoScale extends Control {
    private display: ShadowDisplay;

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

    private updateScale(val: number | null): void {
        if (val === null) {
            return;
        }
        const view = this.display.map.olMap.getView();
        const projection = view.getProjection();
        const scale = this.display.map.getScaleForResolution(
            val,
            projection.getMetersPerUnit() || 1
        );

        this.element.innerHTML = `1 : ${Math.round(scale)}`;
    }
}
