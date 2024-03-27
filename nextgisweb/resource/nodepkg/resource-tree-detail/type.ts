import type {
    TreeItem as ReactComplexTreeItem,
    TreeItemIndex,
} from "react-complex-tree";

import type { FormField } from "@nextgisweb/gui/fields-form";

export type DataObject = Record<string, any>;

export type TreeItemData<R extends DataObject = DataObject> = R & {
    children?: R[];
};

export type TreeItem<R extends DataObject = DataObject> = ReactComplexTreeItem<
    TreeItemData<R>
>;

export type TreeItems<R extends DataObject = DataObject> = Record<
    TreeItemIndex,
    TreeItem<R>
>;

export type TreeDetailFormField = FormField & {
    tableView?: boolean;
};
