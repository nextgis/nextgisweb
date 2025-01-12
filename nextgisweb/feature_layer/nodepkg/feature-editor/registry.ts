/** @registry  */
import type { FC, ReactNode } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";

import type { EditorStore, EditorStoreConstructorOptions } from "../type";

import type { ATTRIBUTES_KEY } from "./constant";
import type { EditorWidgetProps } from "./type";

export type FeatureEditorPluginWidget<S extends EditorStore = EditorStore> =
    ImportCallback<FC<EditorWidgetProps<S>>>;

export type FeatureEditorPluginStore = ImportCallback<
    new (options: EditorStoreConstructorOptions) => EditorStore
>;

export interface FeatureEditorPlugin {
    widget: FeatureEditorPluginWidget;
    store: FeatureEditorPluginStore;
    label: ReactNode;
    identity: typeof ATTRIBUTES_KEY | string;
    order?: number;
}

export const registry = pluginRegistry<FeatureEditorPlugin>(MODULE_NAME);
