import type { FunctionComponent, ForwardRefRenderFunction } from "react";

import type { EditorStore } from "./EditorStore";

export interface EditorWidgetProps<S extends EditorStore = EditorStore> {
    store: S;
}

export interface ActiveOnOptions {
    create?: boolean;
    update?: boolean;
}

interface EditorWidgetOptions {
    title?: string;
    activateOn?: ActiveOnOptions;
    order?: number;
}

export type EditorWidgetComponent = (
    | FunctionComponent<unknown>
    | ForwardRefRenderFunction<unknown>
) &
    EditorWidgetOptions;
