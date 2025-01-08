/** @registry */
import type { ComponentType } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { Plugin } from "@nextgisweb/jsrealm/plugin/registry";

import type { PanelMeta } from "../type";

import type { PanelComponentProps } from "./type";

export type PanelWidget<T = unknown> = ComponentType<PanelComponentProps<T>>;

export type PanelPlugin<T = unknown> = Plugin<PanelWidget<T>, PanelMeta<T>>;

export const registry = pluginRegistry<PanelWidget<any>, PanelMeta<any>>(
    MODULE_NAME
);
