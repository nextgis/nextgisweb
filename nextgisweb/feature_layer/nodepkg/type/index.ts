import type { ReactNode, ComponentType } from "react";

import type {
    EditorStore,
    WidgetValue,
    EditorStoreConstructorOptions,
} from "./EditorStore";
import type { EditorWidgetProps } from "../feature-editor/type";
export * from "./FeatureLayer";
export * from "./FeatureItem";

export { EditorStore, WidgetValue, EditorStoreConstructorOptions };

type WidgetComponent = { default: ComponentType<EditorWidgetProps> };

export interface EditorWidgetRegister<V = unknown> {
    label: string | ReactNode;
    store: new (options: EditorStoreConstructorOptions) => EditorStore<V>;
    component: (() => WidgetComponent) | (() => Promise<WidgetComponent>);
}
