import type { PanelDojoItem } from "../type";

export interface TopicSubscription {
    remove: () => void;
}
export interface DojoTopic {
    subscribe: (
        type: string,
        listener: (...args: any[]) => void
    ) => TopicSubscription;
}

export interface FeatureLayerWebMapPluginConfig {
    likeSearch: boolean;
    readonly: boolean;
}

export interface DisplayItemConfig {
    plugin: Record<string, unknown>;
}

export type DojoPanel = PanelDojoItem;
