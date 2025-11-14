import type { Display } from "../display";
import type { TreeLayerStore } from "../store/tree-store/TreeItemStore";
import type { PluginMenuItem, PluginParams, PluginState } from "../type";
import type { TreeItemType } from "../type/TreeItems";

export abstract class PluginBase {
    readonly identity: string;
    readonly display: Display;

    type: TreeItemType = "layer";

    run?(nodeData: TreeLayerStore): Promise<boolean | undefined>;
    getMenuItem?(nodeData: TreeLayerStore): PluginMenuItem;
    render?(params: PluginState): React.ReactNode;

    constructor({ display, identity }: PluginParams) {
        this.display = display;
        this.identity = identity;
    }

    getPluginState(nodeData: TreeLayerStore): PluginState {
        return {
            enabled:
                nodeData.type === this.type && !!nodeData.plugin[this.identity],
            nodeData,
            map: this.display.map,
        };
    }

    getPlugin<P>(layerId: number): P | null {
        const itemFromStore = Object.values(
            this.display.treeStore.filter({ type: "layer", layerId })
        )[0];
        if (!itemFromStore) return null;

        return itemFromStore.plugin[this.identity] as P | null;
    }
}
