import { observer } from "mobx-react-lite";
import { useState } from "react";
import { ControlledTreeEnvironment, Tree } from "react-complex-tree";
import type { DraggingPosition, TreeItemIndex } from "react-complex-tree";

import { Space } from "@nextgisweb/gui/antd";

import { renderResourceCls } from "../../util/renderResourceCls";
import type { TreeItem, TreeItems } from "../type";

import FolderIcon from "@nextgisweb/icon/mdi/folder";
import FolderOpenIcon from "@nextgisweb/icon/mdi/folder-open";

import "react-complex-tree/lib/style-modern.css";

interface ResourceTreeProps {
    items: TreeItems;
    setItems: React.Dispatch<React.SetStateAction<TreeItems>>;
    selected: TreeItemIndex[];
    setSelected: React.Dispatch<React.SetStateAction<TreeItemIndex[]>>;
    focused: TreeItemIndex | undefined;
    setFocused: React.Dispatch<React.SetStateAction<TreeItemIndex | undefined>>;
}

export const ResourceTree = observer(
    ({
        items: treeItems,
        setItems,
        selected,
        setSelected,
        focused,
        setFocused,
    }: ResourceTreeProps) => {
        const [expandedItems, setExpandedItems] = useState<TreeItemIndex[]>([]);

        const updateOnDrop = (
            prev: TreeItems,
            items: TreeItem[],
            target: DraggingPosition
        ) => {
            const newItems: TreeItems = JSON.parse(JSON.stringify(prev));

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
                        newParent.children.splice(
                            target.childIndex,
                            0,
                            item.index
                        );
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

        const onDrop = (items: TreeItem[], target: DraggingPosition) => {
            setItems((prev) => updateOnDrop(prev, items, target));
        };

        return (
            <>
                <ControlledTreeEnvironment
                    items={treeItems}
                    getItemTitle={(item) => item.data.title}
                    renderItemTitle={({ title, item }) => {
                        if (item.data.resourceItem) {
                            const { cls } = item.data.resourceItem.resource;
                            return renderResourceCls({
                                name: title,
                                cls,
                            });
                        } else {
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
                        }
                    }}
                    canDragAndDrop
                    canDropOnFolder
                    canReorderItems
                    viewState={{
                        ["tree-1"]: {
                            focused,
                            selected,
                            expandedItems,
                        },
                    }}
                    onDrop={onDrop}
                    onFocusItem={(item) => {
                        setFocused(item.index);
                    }}
                    onExpandItem={(item) => {
                        setExpandedItems([...expandedItems, item.index]);
                    }}
                    onCollapseItem={(item) => {
                        setExpandedItems(
                            expandedItems.filter(
                                (expandedItemIndex) =>
                                    expandedItemIndex !== item.index
                            )
                        );
                    }}
                    onSelectItems={(items) => {
                        setSelected(items);
                    }}
                >
                    <Tree treeId="tree-1" rootItem="root" />
                </ControlledTreeEnvironment>
            </>
        );
    }
);
