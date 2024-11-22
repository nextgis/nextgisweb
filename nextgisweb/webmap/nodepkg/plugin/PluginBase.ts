import type { DojoDisplay, PluginParams, PluginState } from "../type";
import type { LayerItem } from "../type/TreeItems";

export abstract class PluginBase {
    display: DojoDisplay;
    identity: string;

    constructor({ display, identity }: PluginParams) {
        this.display = display;
        this.identity = identity;
    }

    abstract getPluginState(nodeData: LayerItem): PluginState;

    postCreate() {}

    startup() {}
}
