import type { Display } from "../display";

export type PanelComponentProps<T = unknown> = {
    display: Display;
    title: string;
    close?: () => void;
    visible?: boolean;
} & T;
