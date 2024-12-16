import type ShadowDisplay from "../compat/ShadowDisplay";

export interface TopicSubscription {
    remove: () => void;
}
export interface DojoTopic {
    subscribe: (
        type: string,
        listener: (...args: any[]) => void
    ) => TopicSubscription;
}

export interface DisplayItemConfig {
    plugin: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReactPanelComponentPropType = Record<string, any>;

export type ReactPanelComponentProps<T = unknown> = {
    display: ShadowDisplay;
    title: string;
    close?: () => void;
    visible?: boolean;
} & T;
