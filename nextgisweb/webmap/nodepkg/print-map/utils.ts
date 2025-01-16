import type OlMap from "ol/Map";
import { Rotate } from "ol/control";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { getLabel } from "../map-controls/map-controls";

export const mmToPx = (mm: number): number => {
    return (mm / 10) * (96 / 2.54);
};

export function setMapScale(scale: number, olMap: OlMap): void {
    const view = olMap.getView();
    const center = view.getCenter();
    if (!center) {
        return;
    }
    const cosh = (value: number) => {
        return (Math.exp(value) + Math.exp(-value)) / 2;
    };
    const pointResolution3857 = cosh(center[1] / 6378137);
    const resolution = pointResolution3857 * (scale / (96 * 39.3701));
    olMap.getView().setResolution(resolution);
}

export function switchRotateControl(olMap: OlMap, show: boolean): void {
    const controls = olMap.getControls();
    const rotateControl = controls
        .getArray()
        .find((control) => control instanceof Rotate);

    if (!rotateControl && show) {
        const rotateControl = new Rotate({
            tipLabel: gettext("Reset rotation"),
            label: getLabel("arrow_upward"),
            autoHide: false,
        });
        olMap.addControl(rotateControl);
    }

    if (rotateControl && !show) {
        olMap.removeControl(rotateControl);
    }
}
