import { useState } from "react";
import { ControlledTreeEnvironment, Tree } from "react-complex-tree";
import type { DraggingPosition, TreeItemIndex } from "react-complex-tree";

import { Space } from "@nextgisweb/gui/antd";

import type {
    DataObject,
    TreeDetailFormField,
    TreeItem,
    TreeItems,
} from "../type";

import FolderIcon from "@nextgisweb/icon/mdi/folder";
import FolderOpenIcon from "@nextgisweb/icon/mdi/folder-open";

import "react-complex-tree/lib/style-modern.css";
import "./ResourceTree.less";

interface ResourceTreeProps<V extends DataObject = DataObject> {
    titleField?: string;
    items: TreeItems<V>;
    selected: TreeItemIndex[];
    style?: React.CSSProperties;
    setItems: React.Dispatch<React.SetStateAction<TreeItems<V>>>;
    setSelected: (selected: TreeItemIndex[]) => void;
    getItemFields?: (options: { item: TreeItem }) => TreeDetailFormField[];
}

export function ResourceTree<V extends DataObject = DataObject>({
    style,
    items: treeItems,
    selected,
    titleField = "display_name",
    getItemFields,
    setSelected,
    setItems,
}: ResourceTreeProps<V>) {
    const [expandedItems, setExpandedItems] = useState<TreeItemIndex[]>([]);

    const updateOnDrop = (
        prev: TreeItems<V>,
        items: TreeItem<V>[],
        target: DraggingPosition
    ) => {
        const newItems: TreeItems<V> = JSON.parse(JSON.stringify(prev));

        for (const item of items) {
            for (const parentKey in newItems) {
                const parent = newItems[parentKey];
                if (parent && parent.children) {
                    parent.children = parent.children.filter(
                        (c) => c !== item.index
                    );
                }
            }

            if (target.targetType === "between-items") {
                const newParent = newItems[target.parentItem];
                if (newParent) {
                    newParent.children = newParent.children || [];
                    newParent.children.splice(target.childIndex, 0, item.index);
                }
            } else if (target.targetType === "item") {
                const newParent = newItems[target.targetItem];
                if (newParent) {
                    // setExpandedItems([...expandedItems, newParent.index]);
                    const newChildren = newParent.children || [];
                    newChildren.push(item.index);
                    newParent.children = newChildren;
                }
            }
        }
        return newItems;
    };

    const onDrop = (items: TreeItem<V>[], target: DraggingPosition) => {
        setItems((prev) => updateOnDrop(prev, items, target));
    };

    return (
        <ControlledTreeEnvironment
            items={treeItems}
            getItemTitle={(item) => item.data[titleField]}
            renderItemTitle={({ title, item }) => {
                if (item.data.children) {
                    return (
                        <Space>
                            {expandedItems.includes(item.index) ? (
                                <FolderOpenIcon />
                            ) : (
                                <FolderIcon />
                            )}
                            {title}
                        </Space>
                    );
                } else {
                    return title;
                }
            }}
            renderItemsContainer={({ containerProps, children }) => (
                <table
                    style={style}
                    className="rct-tree-items-container"
                    {...containerProps}
                >
                    <tbody>{children}</tbody>
                </table>
            )}
            renderItem={({ title, context, item, arrow, children }) => {
                const isSelected = selected.includes(item.index);
                const fields =
                    !selected.length && getItemFields
                        ? getItemFields({ item })
                        : [];
                return (
                    <>
                        <tr
                            role="treeitem"
                            key="display-name"
                            className={`rct-tree-item-li ${isSelected ? "is-active" : ""}`}
                            {...context.itemContainerWithChildrenProps}
                        >
                            <td
                                className="rct-tree-item-title-container"
                                style={{ paddingLeft: "10px" }}
                            >
                                <div className="rct-tree-item-arrow"></div>
                                <button
                                    {...context.itemContainerWithoutChildrenProps}
                                    {...context.interactiveElementProps}
                                    type="button"
                                    className="rct-tree-item-button"
                                >
                                    {arrow}
                                    {title}
                                </button>
                            </td>

                            {fields
                                .filter((field) => field.tableView ?? true)
                                .map((field) => {
                                    return (
                                        <td key={field.name}>
                                            {item.data[field.name]}
                                        </td>
                                    );
                                })}
                        </tr>
                        {children}
                    </>
                );
            }}
            canDragAndDrop
            canDropOnFolder
            canReorderItems
            autoFocus={false}
            viewState={{
                ["tree-1"]: {
                    selected,
                    expandedItems,
                },
            }}
            onDrop={onDrop}
            onExpandItem={(item) => {
                setExpandedItems([...expandedItems, item.index]);
            }}
            onCollapseItem={(item) => {
                setExpandedItems(
                    expandedItems.filter(
                        (expandedItemIndex) => expandedItemIndex !== item.index
                    )
                );
            }}
            onSelectItems={(items) => {
                setSelected(items);
            }}
        >
            <Tree treeId="tree-1" rootItem="root" />
        </ControlledTreeEnvironment>
    );
}
