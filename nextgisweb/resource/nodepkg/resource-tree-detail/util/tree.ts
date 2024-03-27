import { ROOT_INDEX } from "../constant";
import type { DataObject, TreeItemData, TreeItems } from "../type";

export function findNearestParent(index: string | number, items: TreeItems) {
    for (const key in items) {
        const item = items[key];
        if (item.children && item.children.includes(index)) {
            return item;
        }
    }
    return items[ROOT_INDEX];
}

function buildTree<V extends TreeItemData = TreeItemData>(
    flatStructure: TreeItems<V>,
    nodeId: string | number
): TreeItemData<V> {
    const node = flatStructure[nodeId];
    const treeNode: TreeItemData<V> = { ...node.data };

    if (node.children) {
        treeNode.children = node.children.map((childId) =>
            buildTree(flatStructure, childId)
        );
    }

    return treeNode;
}

export function convertToTree<V extends TreeItemData = TreeItemData>(
    flatStructure: TreeItems<V>
): TreeItemData<V>[] {
    const isRoot = (key: string | number): boolean => {
        return !Object.values(flatStructure).some(
            (node) => node.children && node.children.includes(key)
        );
    };

    return Object.keys(flatStructure)
        .filter((key) => isRoot(key))
        .map((key) => buildTree<V>(flatStructure, key));
}

let NEW_TREE_ID = 0;

export function flattenTree<V extends DataObject>(
    tree: TreeItemData<V>[]
): TreeItems<V> {
    return tree.reduce((flatStructure, node) => {
        const index = "layer-tree-id-" + NEW_TREE_ID++;
        const { children, ...nodeData } = node;
        flatStructure[index] = {
            index,
            data: nodeData as V,
        };

        if (children && children.length > 0) {
            const childrenTree = flattenTree(children);
            Object.assign(flatStructure, childrenTree);
            flatStructure[index].children = Object.keys(childrenTree);
        }

        return flatStructure;
    }, {} as TreeItems<V>);
}
