import type { TreeStore } from "@nextgisweb/webmap/store/tree-store/TreeStore";

export function setItemsEditable(
    treeStore: TreeStore,
    itemIds: number[],
    status: boolean
): number[] {
    const changed: number[] = [];

    for (const id of itemIds) {
        const editableItem = treeStore.getItemById(id);
        if (
            editableItem &&
            editableItem.isLayer() &&
            editableItem.editable !== status
        ) {
            editableItem.update({ editable: status });
            changed.push(id);
        }
    }

    return changed;
}
