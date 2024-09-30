import Zoom from "ol/control/Zoom";
import type { Options } from "ol/control/Zoom";

import "./ZoomControl.css";

export class ZoomControl extends Zoom {
    constructor(options: Options) {
        super(options);
        this.element.classList.remove("ol-control");
        this.element.classList.add("mapadapter-ctrl-group");
    }
}
