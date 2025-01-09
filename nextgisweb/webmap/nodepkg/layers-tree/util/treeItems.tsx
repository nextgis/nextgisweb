import type { EventDataNode } from "rc-tree/lib/interface";

import { getChildrenDeep, getParent } from "@nextgisweb/gui/util/tree";
import type { GroupItemConfig } from "@nextgisweb/webmap/type/api";

import type { TreeItemConfig } from "../../type/TreeItems";
import type { TreeWebmapItem } from "../LayersTree";

type Node = EventDataNode<TreeWebmapItem>;

export function isExclusiveGroup(
    treeItem: TreeItemConfig
): treeItem is GroupItemConfig & { exclusive: true } {
    return treeItem.type === "group" && treeItem.exclusive;
}

export function itemIsMutalGroup(treeItem: TreeItemConfig) {
    return isExclusiveGroup(treeItem) ? treeItem : false;
}

export function itemInMutuallyExclusiveGroup(
    item: TreeItemConfig,
    treeItems: TreeItemConfig[]
) {
    const parent = getParent(treeItems, (i) => i.key === item.key);
    if (parent) {
        return itemIsMutalGroup(parent);
    }

    return false;
}

export function keyInMutuallyExclusiveGroupDeep(
    itemKey: number,
    treeItems: TreeItemConfig[]
): TreeItemConfig[] | false {
    let currentNode = getParent(treeItems, (i) => i.key === itemKey);
    const parents: TreeItemConfig[] = [];
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
    firstParent: TreeItemConfig,
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
    parents: TreeItemConfig[],
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
