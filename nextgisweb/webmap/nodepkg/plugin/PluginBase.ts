import type { ComponentType, ReactNode } from "react";

import type { Display } from "../display";
import type {
  TreeItemStore,
  TreeLayerStore,
} from "../store/tree-store/TreeItemStore";
import type { PluginMenuItem, PluginParams, PluginState } from "../type";
import type { TreeItemType } from "../type/TreeItems";

export interface PluginRunOptions {
  signal?: AbortSignal;
}

export abstract class PluginBase<T extends TreeItemStore = TreeLayerStore> {
  readonly identity: string;
  readonly display: Display;

  type: TreeItemType = "layer";

  run?(nodeData: T, options?: PluginRunOptions): Promise<boolean | undefined>;
  getMenuItem?(nodeData: T, options?: PluginRunOptions): PluginMenuItem;
  render?(params: PluginState<T>): ReactNode;
  renderMap?: ComponentType<{ display: Display; identity: string }>;

  constructor({ display, identity }: PluginParams) {
    this.display = display;
    this.identity = identity;
  }

  getPluginState(nodeData: T): PluginState<T> {
    return {
      enabled: nodeData.type === this.type && !!nodeData.plugin[this.identity],
      nodeData,
      map: this.display.map,
    };
  }
}
