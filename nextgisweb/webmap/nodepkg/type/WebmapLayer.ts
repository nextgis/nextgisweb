/// <reference types="dojo/dijit" />

import type OlLayer from "ol/layer/Layer"; // Modify the import based on actual OL Layer path
import type OlSource from "ol/source/Source"; // Modify the import based on actual OL Source path

import type { LayerItem } from "./TreeItems";

export interface WebmapLayer extends dojo.Stateful {
    itemConfig: LayerItem;
    olLayer: OlLayer;
    olSource: OlSource;
    olLayerClassName: string;
    olSourceClassName: string;
    title: string;
    reload: () => void;
    printingCopy: () => OlLayer;
}
