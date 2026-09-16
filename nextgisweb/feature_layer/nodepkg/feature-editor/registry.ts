/** @registry  */
import type { FC, ReactNode } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";

import type { EditorStore, EditorStoreConstructor } from "../type";

import type { FeatureEditorStore } from "./FeatureEditorStore";
import type { EditorWidgetProps } from "./type";

export type FeatureEditorPluginWidget<S extends EditorStore = EditorStore> = FC<
  EditorWidgetProps<S>
>;

export type FeatureEditorPluginStore<S extends EditorStore = EditorStore> =
  ImportCallback<EditorStoreConstructor<S>>;

export interface FeatureEditorTab {
  widget: FeatureEditorPluginWidget;
  store: EditorStore;
  label: ReactNode;
  identity: string;
  order?: number;
}

export interface FeatureEditorPlugin<S extends EditorStore = EditorStore> {
  store: FeatureEditorPluginStore<S>;
  provider(options: {
    parentStore: FeatureEditorStore;
    store: S;
  }): FeatureEditorTab[] | Promise<FeatureEditorTab[]>;
}

export const registry = pluginRegistry<FeatureEditorPlugin>(MODULE_NAME);

export function featureEditorRegistry<S extends EditorStore>(
  compId: string,
  plugin: FeatureEditorPlugin<S>
) {
  registry.register(compId, plugin);
}
