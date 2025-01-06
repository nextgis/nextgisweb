import type { Display } from "../display";

export type PanelComponentProps<T = unknown> = {
    display: Display;
    name: string;
    title: string;
    close?: () => void;
    visible?: boolean;
} & T;
