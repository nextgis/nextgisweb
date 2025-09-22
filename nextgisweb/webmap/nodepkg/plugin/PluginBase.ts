import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import type { Display } from "../display";
import type { PluginMenuItem, PluginParams, PluginState } from "../type";
import type { TreeItemType } from "../type/TreeItems";

export abstract class PluginBase {
    readonly identity: string;
    readonly display: Display;

    type: TreeItemType = "layer";

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

    getPlugin<P>(layerId: number): P | null {
        const itemFromStore = Object.values(
            this.display.itemStore.fetch({ query: { type: "layer", layerId } })
        )[0];
        if (!itemFromStore) return null;
        const infoConfig = this.display.getItemConfig()[itemFromStore.id];
        if (infoConfig.type !== "layer") return null;
        return infoConfig?.plugin[this.identity] as P | null;
    }

    postCreate() {}

    startup() {}
}
