import Attr from "ol/control/Attribution";
import type { Options } from "ol/control/Attribution";

const OPTIONS = {
    collapsible: false,
};

export class Attribution extends Attr {
    constructor(options: Options) {
        super({ ...OPTIONS, ...options });
    }
}
