import type { FunctionComponent } from "react";

import type { CompositeWidgetOperation } from "@nextgisweb/resource/type/api";

import type { EditorStore } from "./EditorStore";

export interface EditorWidgetProps<S extends EditorStore = EditorStore> {
    store: S;
}

export type ActiveOnOptions = {
    [key in CompositeWidgetOperation]?: boolean;
};

interface EditorWidgetOptions {
    title?: string;
    activateOn?: ActiveOnOptions;
    order?: number;
}

export type EditorWidget<
    S extends EditorStore,
    P = EditorWidgetProps<S>,
> = FunctionComponent<P> & EditorWidgetOptions;
