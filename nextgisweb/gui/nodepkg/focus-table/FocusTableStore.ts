import { autorun, makeAutoObservable, runInAction, toJS } from "mobx";
import type { TreeItemIndex } from "react-complex-tree";

import type { SizeType } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ROOT_INDEX } from "./constant";
import type {
    GetItemFieldsFunction,
    TreeItem,
    TreeItemData,
    TreeItems,
} from "./type";
import { convertToTree, findNearestParent, flattenTree } from "./util/tree";

export interface FocusTableStoreProps<V extends TreeItemData = TreeItemData> {
    size?: SizeType;
    initValue?: V[];
    titleField?: keyof V;
    disableGroups?: boolean;
    canDeleteItem?: boolean | ((item: TreeItem<V>) => boolean);
    getItemFields?: GetItemFieldsFunction<V>;
    onChange?: (val: V[]) => void;
}

type P<V extends TreeItemData = TreeItemData> = FocusTableStoreProps<V>;

const msgNewFolder = gettext("New group");

export class FocusTableStore<V extends TreeItemData = TreeItemData>
    implements Nullable<P<V>>
{
    private _id = 0;

    focused: TreeItemIndex | null = null;
    items: TreeItems<V> = {};

    size: SizeType;
    initValue: P<V>["initValue"] | null = null;
    titleField: P<V>["titleField"];
    disableGroups: P<V>["disableGroups"] = true;
    canDeleteItem: P<V>["canDeleteItem"] = false;
    getItemFields: P<V>["getItemFields"] | null = null;
    onChange: P<V>["onChange"] | null = null;

    constructor({
        size = "middle",
        initValue,
        titleField = "title",
        disableGroups = false,
        canDeleteItem,
        getItemFields,
        onChange,
    }: P<V>) {
        this.size = size;
        this.initValue = initValue;
        this.titleField = titleField;
        this.disableGroups = disableGroups;
        this.canDeleteItem = canDeleteItem;
        this.getItemFields = getItemFields;
        this.onChange = onChange;

        this.reset();

        makeAutoObservable<FocusTableStore<V>, "_id">(this, { _id: false });

        autorun(() => {
            if (this.onChange && this.items) {
                const tree = convertToTree<V>(this.items);
                const rootChildren = tree[0] && tree[0].children;
                if (rootChildren) {
                    this.onChange(rootChildren);
                }
            }
        });
    }

    reset() {
        const initValue = this.initValue;
        const flatTree = initValue ? flattenTree(initValue) : {};
        this.items = {
            [ROOT_INDEX]: {
                index: ROOT_INDEX,
                isFolder: true,
                children: Object.keys(flatTree),
                data: {},
            } as TreeItem<V>,
            ...flatTree,
        };
    }

    setItems = (
        itemsOrUpdater: TreeItems<V> | ((prev: TreeItems<V>) => TreeItems<V>)
    ) => {
        runInAction(() => {
            if (typeof itemsOrUpdater === "function") {
                this.items = itemsOrUpdater(toJS(this.items));
            } else {
                this.items = itemsOrUpdater;
            }
        });
    };

    setFocused = (
        focusedOrUpdater:
            | TreeItemIndex
            | null
            | ((prev: TreeItemIndex | null) => TreeItemIndex | null)
    ) => {
        runInAction(() => {
            if (typeof focusedOrUpdater === "function") {
                this.focused = focusedOrUpdater(this.focused);
            } else {
                this.focused = focusedOrUpdater;
            }
        });
    };

    addTreeItems = (newItems: Omit<TreeItem, "index">[]) => {
        const focused = this.focused;
        this.setItems((prevItems) => {
            const updatedItems = { ...prevItems };
            let parentIndex: TreeItemIndex = ROOT_INDEX;

            if (focused) {
                const parent = updatedItems[focused];
                if (parent && !parent.isFolder) {
                    const nearestParent = findNearestParent(
                        focused,
                        updatedItems
                    ) as TreeItem<V>;
                    parentIndex = nearestParent
                        ? nearestParent.index
                        : ROOT_INDEX;
                } else {
                    parentIndex = focused;
                }
            }

            const parentItem = (updatedItems[parentIndex] = updatedItems[
                parentIndex
            ] || { children: [], isFolder: true });
            parentItem.children = parentItem.children || [];

            newItems.forEach((item) => {
                const newId = `added-tree-item-${String(this._id++)}`;
                updatedItems[newId] = {
                    index: newId,
                    ...item,
                } as TreeItem<V>;
                parentItem.children!.push(newId);
            });

            return updatedItems;
        });
    };

    addGroupItem = () => {
        const titleField = String(this.titleField);
        this.addTreeItems([
            {
                isFolder: true,
                children: [],
                canMove: true,
                data: {
                    [titleField]: `${msgNewFolder} ${this._id}`,
                },
            },
        ]);
    };

    deleteItem = (index: TreeItemIndex) => {
        this.setItems((prevItems) => {
            const updatedItems = { ...prevItems };

            const deleteItemAndChildren = (itemId: TreeItemIndex) => {
                const item = updatedItems[itemId];
                if (itemId === this.focused) {
                    this.setFocused(null);
                }
                if (item && item.children) {
                    item.children.forEach((childId) =>
                        deleteItemAndChildren(childId)
                    );
                }
                delete updatedItems[itemId];
            };

            deleteItemAndChildren(index);

            const parent = findNearestParent(index, updatedItems);
            if (parent && parent.children) {
                parent.children = parent.children.filter(
                    (childId) => childId !== index
                );
            }

            return updatedItems;
        });
    };

    deleteFocused = () => {
        if (this.focused) {
            this.deleteItem(this.focused);
        }
    };
}
