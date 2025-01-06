import type {
    DojoDisplay,
    PluginMenuItem,
    PluginParams,
    PluginState,
} from "../type";
import type { LayerItem, LayerType } from "../type/TreeItems";

export abstract class PluginBase {
    display: DojoDisplay;
    identity: string;
    type: LayerType = "layer";

    run?(): void;
    getMenuItem?(): PluginMenuItem;

    constructor({ display, identity }: PluginParams) {
        this.display = display;
        this.identity = identity;
    }

    getPluginState(nodeData: LayerItem): PluginState {
        return {
            enabled:
                nodeData.type === this.type && !!nodeData.plugin[this.identity],
            nodeData,
            map: this.display.map,
        };
    }




    postCreate() {}

    startup() {}
}
