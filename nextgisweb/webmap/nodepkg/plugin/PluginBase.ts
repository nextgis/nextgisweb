import type { Display } from "../display";
import type { PluginMenuItem, PluginParams, PluginState } from "../type";
import type { LayerItemConfig, LayerType } from "../type/TreeItems";

export abstract class PluginBase {
    display: Display;
    identity: string;
    type: LayerType = "layer";

    run?(nodeData: LayerItemConfig): Promise<boolean | undefined>;
    getMenuItem?(nodeData: LayerItemConfig): PluginMenuItem;
    render?(params: PluginState): React.ReactNode;

    constructor({ display, identity }: PluginParams) {
        this.display = display;
        this.identity = identity;
    }

    getPluginState(nodeData: LayerItemConfig): PluginState {
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
