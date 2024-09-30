import Control from "ol/control/Control";

import type {
    CreateControlOptions,
    MapControl,
} from "@nextgisweb/webmap/control-container/ControlContainer";

import type { MapAdapter } from "../MapAdapter";

export function createControl(
    control: MapControl,
    options: CreateControlOptions = {},
    map: MapAdapter
): Control {
    class NewControl extends Control {
        constructor() {
            const element = document.createElement("div");
            element.className =
                (options.addClass ? options.addClass + " " : "") +
                "ol-unselectable" +
                (options.bar ? " webmap-ctrl-group" : "") +
                (options.margin ? " ol-control-margin" : "");

            const content = control.onAdd(map);
            if (content) {
                element.appendChild(content);
            }

            super({ element });
        }
    }

    return new NewControl();
}
