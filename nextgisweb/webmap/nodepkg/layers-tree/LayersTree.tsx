import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Tree } from "@nextgisweb/gui/antd";
import type { TreeProps } from "@nextgisweb/gui/antd";
import { EditIcon } from "@nextgisweb/gui/icon";
import { findNode } from "@nextgisweb/gui/util/tree";

import type { TreeStore } from "../store";
import type {
    TreeItemStore,
    TreeLayerStore,
} from "../store/tree-store/TreeItemStore";

import { LayerTreeItemTitle } from "./LayerTreeItemTitle";
import { useDrag } from "./hook/useDrag";
import { updateKeysForGroup } from "./util/treeItems";

import "./LayersTree.less";

type TreeNodeData = NonNullable<TreeProps["treeData"]>[0];

export type TreeWebmapItem = TreeNodeData & {
    key: number;
    children?: TreeWebmapItem[];
    legendIcon?: React.ReactNode;
    treeItem: TreeItemStore;
};

interface LayersTreeProps {
    store: TreeStore;
    showLine?: boolean;
    checkable?: boolean;
    draggable?: boolean;
    selectable?: boolean;
    showLegend?: boolean;
    expandable?: boolean;
    showDropdown?: boolean;
    onFilterItems?: (
        store: TreeStore,
        layersItems: TreeWebmapItem[]
    ) => TreeWebmapItem[];
    onSelect?: (keys: number[]) => void;
    onReady?: () => void;
}

const LegendIcon = observer(({ treeItem }: { treeItem: TreeLayerStore }) => {
    const { legendInfo } = treeItem;
    if (legendInfo) {
        if (
            legendInfo &&
            legendInfo.visible &&
            legendInfo.single &&
            legendInfo.symbols
        ) {
            return (
                <img
                    width={20}
                    height={20}
                    src={
                        "data:image/png;base64," +
                        legendInfo.symbols[0].icon.data
                    }
                />
            );
        }
    }
});

LegendIcon.displayName = "LegendIcon";

const ItemIcon = observer(({ treeItem }: { treeItem: TreeLayerStore }) => {
    if (treeItem.editable === true) {
        return <EditIcon />;
    } else {
        return <LegendIcon treeItem={treeItem} />;
    }
});

ItemIcon.displayName = "ItemIcon";

export const LayersTree = observer(
    ({
        store,
        showLine = true,
        draggable = true,
        checkable = true,
        expandable = true,
        selectable = true,
        showLegend = true,
        showDropdown = true,
        onFilterItems,
        onSelect: onSelectProp,
        onReady,
    }: LayersTreeProps) => {
        const [selectedKeys, setSelectedKeys] = useState<number[]>([]);

        const {
            visibleLayerIds,
            childrenIds,
            treeStructureStamp,
            layersWithoutLegendInfo,
        } = store;

        const { onDrop, allowDrop } = useDrag({ store });

        const onSelect = useCallback(
            (selectedKeysValue: React.Key[]) => {
                const val = selectedKeysValue.map(Number);
                setSelectedKeys(val);
                if (onSelectProp) onSelectProp(val);
            },
            [onSelectProp]
        );

        const handleWebMapItem = useCallback(
            (treeItem: TreeItemStore): TreeWebmapItem => {
                const { id, title, parentId } = treeItem;

                let inExclusiveGroup = false;

                if (store.hasExclusiveGroup && parentId !== null) {
                    const parentItem = store.getItemById(parentId);
                    inExclusiveGroup =
                        !!parentItem &&
                        parentItem.isGroup() &&
                        parentItem.exclusive;
                }

                const item: TreeWebmapItem = {
                    key: id,
                    title,
                    treeItem: treeItem,
                    className: inExclusiveGroup ? "exclusive-child" : undefined,
                };
                if (treeItem.isLayer()) {
                    item.isLeaf = true;

                    item.icon = <ItemIcon treeItem={treeItem} />;

                    item.title = (
                        <LayerTreeItemTitle
                            treeItem={treeItem}
                            checkable={checkable}
                            showLegend={showLegend}
                            showDropdown={showDropdown}
                            onSelect={onSelect}
                        />
                    );
                }

                if (treeItem.isGroup()) {
                    const children: TreeWebmapItem[] = [];
                    [...treeItem.childrenIds].reverse().forEach((cid) => {
                        const it = store.getItemById(cid);
                        if (it) {
                            children.push(handleWebMapItem(it));
                        }
                    });
                    item.children = children;
                }
                return item;
            },
            [checkable, store, showLegend, showDropdown, onSelect]
        );

        const preparedWebMapItems = useMemo(() => {
            void treeStructureStamp;
            return store
                .getChildren({ childrenIds: [...childrenIds].reverse() })
                .map(handleWebMapItem);
        }, [childrenIds, treeStructureStamp, handleWebMapItem, store]);

        const treeItems = useMemo(() => {
            if (onFilterItems) {
                return onFilterItems(store, preparedWebMapItems);
            }
            return preparedWebMapItems;
        }, [onFilterItems, preparedWebMapItems, store]);

        const hasGroups = useMemo(() => store.some({ type: "group" }), [store]);

        useEffect(() => {
            if (onReady) {
                onReady();
            }
        }, [onReady]);

        useEffect(() => {
            store.updateResourceLegendSymbols(
                layersWithoutLegendInfo.map((layer) => layer.styleId)
            );
        }, [store, layersWithoutLegendInfo]);

        const onExpand = (expandedKeysValue: React.Key[]) => {
            if (!expandable) return;
            store.setExpanded(expandedKeysValue.map(Number));
        };

        const onCheck: TreeProps<TreeWebmapItem>["onCheck"] = (
            checkedKeysValue,
            event
        ) => {
            const checkedItem = event.node;
            const checkedKeys = (
                Array.isArray(checkedKeysValue)
                    ? checkedKeysValue
                    : checkedKeysValue.checked
            ).map(Number);

            let updatedCheckedKeys = checkedKeys;

            if (checkedItem.treeItem.isGroup()) {
                updatedCheckedKeys = updateKeysForGroup(
                    checkedItem,
                    checkedKeys,
                    store.visibleLayerIds
                );
            }

            store.setVisibleIds(updatedCheckedKeys);
        };

        const checkedKeys = useMemo(() => {
            const ch = visibleLayerIds.filter((id) =>
                findNode(treeItems, (node) => node.key === id)
            );
            return ch;
        }, [visibleLayerIds, treeItems]);

        const shouldShowLine = showLine && hasGroups;

        return (
            <Tree
                className={
                    "ngw-webmap-layers-tree" + (!shouldShowLine ? " flat" : "")
                }
                treeData={treeItems}
                virtual={false}
                motion={false}
                checkable={checkable}
                selectable={selectable}
                showIcon
                showLine={shouldShowLine}
                onExpand={onExpand}
                expandedKeys={store.expanded}
                autoExpandParent={false}
                onCheck={onCheck}
                checkedKeys={checkedKeys}
                onSelect={onSelect}
                selectedKeys={selectedKeys}
                allowDrop={allowDrop}
                draggable={draggable && { icon: false }}
                onDrop={onDrop}
                blockNode
            />
        );
    }
);

LayersTree.displayName = "LayersTree";
