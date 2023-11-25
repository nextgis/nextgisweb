import type { TreeItem } from "./TreeItems";

interface PluginState {
    enabled: boolean;
}

export interface WebmapPlugin {
    getPluginState: (nodeData: TreeItem) => PluginState;
    getMenuItem?: (nodeData: TreeItem) => {
        icon: JSX.Element | string;
        title: string;
        onClick?: () => void;
    };
    run?: (nodeData: TreeItem) => Promise<any>;
    render?: (pluginState: PluginState) => JSX.Element;
}
