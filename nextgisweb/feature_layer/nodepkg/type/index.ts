import type { ReactNode, ComponentType } from "react";

import type { EditorStore, EditorStoreConstructorOptions } from "./EditorStore";
import type { EditorWidgetProps } from "../feature-editor/type";
export * from "./FeatureLayer";
export * from "./FeatureItem";

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
