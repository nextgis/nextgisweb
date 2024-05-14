import type { EventDataNode } from "rc-tree/lib/interface";

import { getChildrenDeep, getParent } from "@nextgisweb/gui/util/tree";

import type { GroupItem, LayerItem, TreeItem } from "../../type/TreeItems";
import type { TreeWebmapItem } from "../LayersTree";

import EditIcon from "@nextgisweb/icon/material/edit/outline";

type Node = EventDataNode<TreeWebmapItem>;

const handleWebMapItem = (webMapItem: TreeItem): TreeWebmapItem => {
    const { key, title } = webMapItem;
    const item: TreeWebmapItem = { key, title, treeItem: webMapItem };
    if (item.treeItem.type === "layer") {
        item.isLeaf = true;

        if ("legendInfo" in item.treeItem) {
            const { legendInfo } = item.treeItem;
            if (legendInfo && legendInfo.visible && legendInfo.single) {
                item.legendIcon = (
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

        item.icon = (item_) => {
            const item = item_ as TreeWebmapItem;
            if ((item.treeItem as LayerItem).editable === true) {
                return <EditIcon />;
            } else {
                if (item.legendIcon) {
                    return item.legendIcon;
                }
            }
        };
    }

    if ("children" in webMapItem) {
        item.children = webMapItem.children.map(handleWebMapItem);
    }
    return item;
};

export const prepareWebMapItems = (webMapItems: TreeItem[]) => {
    return webMapItems.map(handleWebMapItem);
};

export function isExclusiveGroup(
    treeItem: TreeItem
): treeItem is GroupItem & { exclusive: true } {
    return treeItem.type === "group" && treeItem.exclusive;
}

export function itemIsMutalGroup(treeItem: TreeItem) {
    return isExclusiveGroup(treeItem) ? treeItem : false;
}

export function itemInMutuallyExclusiveGroup(
    item: TreeItem,
    treeItems: TreeItem[]
) {
    const parent = getParent(treeItems, (i) => i.key === item.key);
    if (parent) {
        return itemIsMutalGroup(parent);
    }

    return false;
}

export function keyInMutuallyExclusiveGroupDeep(
    itemKey: number,
    treeItems: TreeItem[]
): TreeItem[] | false {
    let currentNode = getParent(treeItems, (i) => i.key === itemKey);
    const parents: TreeItem[] = [];
    let lastMutualGroupIndex: number | null = null;

    while (currentNode) {
        const currentKey = currentNode.key;
        parents.push(currentNode);
        if (itemIsMutalGroup(currentNode)) {
            lastMutualGroupIndex = parents.length - 1;
        }
        currentNode = getParent(treeItems, (i) => i.key === currentKey);
    }

    if (lastMutualGroupIndex !== null) {
        return parents.slice(0, lastMutualGroupIndex + 1);
    }

    return false;
}

export function determineAdditionalKeys(
    node: Node,
    firstParent: TreeItem,
    keys: number[]
) {
    const treeItem = node.treeItem;
    if (treeItem.type === "group") {
        return !node.checked && !node.halfChecked && treeItem.children
            ? treeItem.children.map((c) => Number(c.key))
            : [];
    } else if (firstParent.type === "group" && !firstParent.exclusive) {
        return firstParent.children
            .map((c) => c.key)
            .filter((k) => keys.includes(k));
    }
    return node.checked ? [] : [treeItem.key];
}

export function updateKeysForMutualExclusivity(
    node: Node,
    parents: TreeItem[],
    keys: number[]
) {
    const mutuallyExclusive = parents[parents.length - 1];
    const firstParent = parents[0];

    const mutualItems = getChildrenDeep(mutuallyExclusive);
    const mutualKeys = [
        ...mutualItems.map((m) => Number(m.key)),
        mutuallyExclusive.key,
    ];

    const additionalKeys = determineAdditionalKeys(node, firstParent, keys);
    return [...keys.filter((k) => !mutualKeys.includes(k)), ...additionalKeys];
}

export function updateKeysForGroup(
    node: Node,
    /** These are the keys after the default operation in the tree. */
    keys: number[],
    storedKeys: number[]
) {
    if (isExclusiveGroup(node.treeItem)) {
        if (node.halfChecked) {
            const deepChildren = getChildrenDeep(node);
            return storedKeys.filter(
                (k) => !deepChildren.map((c) => c.key).includes(k)
            );
        } else if (!node.checked) {
            return [
                ...storedKeys,
                ...(node.children || []).map((c) => Number(c.key)),
            ];
        }
    }
    return keys;
}
