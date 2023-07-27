export type WidgetValue<T> = null | T;

export interface EditorStoreConstructorOptions {
    resourceId: number;
    featureId: number;
}

export interface EditorStore<V = unknown> {
    value: WidgetValue<V>;

    resourceId: number;
    featureId: number;

    load: (value: WidgetValue<V>) => void;

    isValid?: boolean;
}
