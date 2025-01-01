import type ShadowDisplay from "../compat/ShadowDisplay";

export type PanelComponentProps<T = unknown> = {
    display: ShadowDisplay;
    title: string;
    close?: () => void;
    visible?: boolean;
} & T;
