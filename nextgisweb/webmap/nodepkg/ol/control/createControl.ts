import Control from "ol/control/Control";

import type {
    CreateControlOptions,
    MapControl,
} from "@nextgisweb/webmap/control-container/ControlContainer";

import type { MapStore } from "../MapStore";

import { updateControlAppearance } from "./updateControlAppearance";

export function createControl(
    control: MapControl,
    options: CreateControlOptions = {},
    map: MapStore
): Control {
    class NewControl extends Control {
        constructor() {
            const element = document.createElement("div");
            const createElement = () => {
                updateControlAppearance(element, options);
                return element;
            };

            control.onAdd(map);

            super({ element: createElement() });
        }
    }

    return new NewControl();
}
