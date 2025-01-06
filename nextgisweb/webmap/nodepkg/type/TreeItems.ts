import type {
    GroupItemConfig,
    LayerItemConfig,
    RootItemConfig,
} from "@nextgisweb/webmap/type/api";

export type TreeItemConfig = RootItemConfig | GroupItemConfig | LayerItemConfig;
export type TreeChildrenItemConfig = GroupItemConfig | LayerItemConfig;

export type TreeItemType = TreeItemConfig["type"];
