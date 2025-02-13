import type { ForwardRefRenderFunction, FunctionComponent } from "react";

import type { ResourceWidget } from "@nextgisweb/resource/type/api";

import type { EditorStore } from "./EditorStore";

export interface EditorWidgetProps<S extends EditorStore = EditorStore> {
    store: S;
}

type Operation = ResourceWidget["operation"];
export type ActiveOnOptions = {
    [key in Operation]?: boolean;
};

interface EditorWidgetOptions {
    title?: string;
    activateOn?: ActiveOnOptions;
    order?: number;
}

export type EditorWidgetComponent<P = unknown> = (
    | FunctionComponent<P>
    | ForwardRefRenderFunction<unknown, P>
) &
    EditorWidgetOptions;
