import type { TreeProps } from "@nextgisweb/gui/antd";
import { getChildrenDeep } from "@nextgisweb/gui/util/tree";

import type { TreeWebmapItem } from "../LayersTree";

type OnCheck = NonNullable<TreeProps<TreeWebmapItem>["onCheck"]>;
type CheckInfoForWebmap = Parameters<OnCheck>[1];
type Node = CheckInfoForWebmap["node"];

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
