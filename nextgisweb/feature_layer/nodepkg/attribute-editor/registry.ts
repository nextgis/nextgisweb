/** @registry */
import type { ReactNode } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type AttributeEditorStore from "./AttributeEditorStore";

export interface AttributeEditorLayout {
  identity: string;
  label: ReactNode;
  content: ReactNode;
}

export type AttributeEditorLayoutProvider = (
  store: AttributeEditorStore
) => Promise<AttributeEditorLayout[]>;

export const registry =
  pluginRegistry<AttributeEditorLayoutProvider>(MODULE_NAME);
