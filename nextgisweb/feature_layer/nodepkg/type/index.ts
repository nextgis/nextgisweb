import type { ComponentType, ReactNode } from "react";

import type { EditorWidgetProps } from "../feature-editor/type";

import type { EditorStore, EditorStoreConstructorOptions } from "./EditorStore";

export * from "./FeatureItem";
export * from "./FeatureLayer";
export * from "./GeometryType";

export { EditorStore, EditorStoreConstructorOptions };

type WidgetComponent<V = unknown, S extends EditorStore<V> = EditorStore<V>> = {
    default: ComponentType<EditorWidgetProps<V, S>>;
};

export interface EditorWidgetRegister<
    V = unknown,
    S extends EditorStore<V> = EditorStore<V>,
> {
    label: string | ReactNode;
    store: new (options: EditorStoreConstructorOptions) => S;
    component:
        | (() => WidgetComponent<V, S>)
        | (() => Promise<WidgetComponent<V, S>>);
}
