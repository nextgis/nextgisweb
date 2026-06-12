import type {
  GroupItemConfig,
  LayerItemConfig,
  RootItemConfig,
} from "@nextgisweb/webmap/type/api";

import type {
  TreeGroupStore,
  TreeItemStore,
} from "../store/tree-store/TreeItemStore";

export type TreeItemConfig = RootItemConfig | GroupItemConfig | LayerItemConfig;
export type TreeChildrenItemConfig = GroupItemConfig | LayerItemConfig;

export type TreeItemType = TreeItemConfig["type"];

export type TreeChildrenItemStore = TreeItemStore | TreeGroupStore;
