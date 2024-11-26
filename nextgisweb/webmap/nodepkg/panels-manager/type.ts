import type { DojoDisplay, PanelDojoItem } from "../type";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReactPanelComponentPropType = Record<string, any>;

export interface ReactPanelComponentProps {
    display: DojoDisplay;
    title: string;
    close?: () => void;
    visible?: boolean;
}

export type DojoPanel = PanelDojoItem;
