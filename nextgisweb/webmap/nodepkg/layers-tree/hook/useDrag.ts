import type { TreeProps } from "@nextgisweb/gui/antd";
import type { TreeItemStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

import type { TreeStore } from "../../store";

type TreeNodeData = NonNullable<TreeProps["treeData"]>[0];

interface UseDragProps {
    store: TreeStore;
}

export function useDrag({ store }: UseDragProps) {
    const allowDrop: TreeProps["allowDrop"] = (e) => {
        const dropNode = e.dropNode as TreeNodeData;
        return dropNode.isLeaf ? !!e.dropPosition : true;
    };

    const onDrop: TreeProps["onDrop"] = (info) => {
        const dropKey = Number(info.node.key);
        const dragKey = Number(info.dragNode.key);

        const dragItem = store.getItemById(dragKey);
        const dropItem = store.getItemById(dropKey);
        if (!dragItem || !dropItem) return;

        if (!info.dropToGap) {
            let p: TreeItemStore | null = dropItem;
            while (p && p.parentId !== null) {
                if (p.parentId === dragItem.id) return;
                p = store.getItemById(p.parentId);
            }
        }

        let targetParentId: number | null;
        let targetIndexStore: number;
        let siblingsStore: TreeItemStore[] = [];

        if (info.dropToGap) {
            targetParentId = dropItem.parentId;

            siblingsStore =
                targetParentId === null
                    ? store.getChildren(store as any)
                    : store.getChildren(targetParentId);

            const uiSiblings = siblingsStore.slice().toReversed();
            const uiIndex = uiSiblings.findIndex((n) => n.id === dropItem.id);
            if (uiIndex < 0) return;

            const uiTargetIndex =
                info.dropPosition === -1 ? uiIndex : uiIndex + 1;

            targetIndexStore = siblingsStore.length - uiTargetIndex;
        } else {
            if (!dropItem.isGroup()) return;
            targetParentId = dropItem.id;

            siblingsStore = store.getChildren(dropItem.id);

            targetIndexStore = siblingsStore.length;
        }

        if (dragItem.parentId === targetParentId) {
            const fromIndex = siblingsStore.findIndex(
                (n) => n.id === dragItem.id
            );
            if (fromIndex >= 0 && fromIndex < targetIndexStore) {
                targetIndexStore -= 1;
            }
            if (fromIndex === targetIndexStore) return;
        }

        store.move(dragItem.id, targetParentId, targetIndexStore);
    };

    return { onDrop, allowDrop };
}
