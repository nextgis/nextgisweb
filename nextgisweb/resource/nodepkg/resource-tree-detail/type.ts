import type {
    TreeItem as ReactComplexTreeItem,
    TreeItemIndex,
} from "react-complex-tree";

import type { ResourceItem } from "../type";

export interface TreeItemData {
    title: string;
    resourceItem?: ResourceItem;
}

export type TreeItem = ReactComplexTreeItem<TreeItemData>;

export type TreeItems = Record<TreeItemIndex, TreeItem>;
