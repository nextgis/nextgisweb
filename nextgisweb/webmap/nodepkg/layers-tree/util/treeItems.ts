import type { EventDataNode } from "rc-tree/lib/interface";

import { getChildrenDeep } from "@nextgisweb/gui/util/tree";

import type { TreeWebmapItem } from "../LayersTree";

type Node = EventDataNode<TreeWebmapItem>;

export function updateKeysForGroup(
    node: Node,
    /** These are the keys after the default operation in the tree. */
    keys: number[],
    storedKeys: number[]
) {
    if (node.halfChecked) {
        const deepChildren = getChildrenDeep(node);
        return storedKeys.filter(
            (k) => !deepChildren.map((c) => c.key).includes(k)
        );
    }
    if (node.treeItem.isGroup() && node.treeItem.exclusive) {
        if (!node.checked) {
            return [
                ...storedKeys,
                ...getChildrenDeep(node).map((c) => Number(c.key)),
            ];
        }
    }
    return keys;
}
