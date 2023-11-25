import type { TreeProps } from "@nextgisweb/gui/antd";

import type WebmapStore from "../../store";
import type { TreeItem } from "../../type/TreeItems";

type TreeNodeData = NonNullable<TreeProps["treeData"]>[0];

const traverseTree = (
    items: TreeItem[],
    callback: (item: TreeItem, index: number, arr: TreeItem[]) => boolean | void
): boolean => {
    return items.some((item, index, arr) => {
        if (callback(item, index, arr) === true) {
            return true;
        }
        if ("children" in item) {
            return traverseTree(item.children, callback);
        }
    });
};

interface UseDragProps {
    store: WebmapStore;
    setLayerZIndex: (id: number, zIndex: number) => void;
}

export function useDrag({ store, setLayerZIndex }: UseDragProps) {
    const allowDrop: TreeProps["allowDrop"] = (e) => {
        const dropNode = e.dropNode as TreeNodeData;
        return dropNode.isLeaf ? !!e.dropPosition : true;
    };

    const onDrop: TreeProps["onDrop"] = (info) => {
        const dropKey = info.node.key;
        const dragKey = info.dragNode.key;
        const dropPos = info.node.pos.split("-");
        const dropPosition =
            info.dropPosition - Number(dropPos[dropPos.length - 1]);
        const data = [...store.webmapItems] as TreeItem[];

        let dragObj: TreeItem | undefined;

        traverseTree(data, (item, index, arr) => {
            if (item.key === dragKey) {
                dragObj = item;
                arr.splice(index, 1);
                return true;
            }
        });

        if (dragObj) {
            const insertItem = (item: TreeItem) => {
                if ("children" in item) {
                    item.children.unshift(dragObj as TreeItem);
                }
            };

            if (!info.dropToGap) {
                traverseTree(
                    data,
                    (item) => item.key === dropKey && insertItem(item)
                );
            } else {
                let ar: TreeItem[] = [];
                let i: number = 0;
                traverseTree(data, (item, index, arr) => {
                    if (item.key === dropKey) {
                        ar = arr;
                        i = index;
                        return true;
                    }
                });

                if (dropPosition === -1) {
                    ar.splice(i, 0, dragObj);
                } else {
                    ar.splice(i + 1, 0, dragObj);
                }
            }

            store.setWebmapItems(data);

            // Update zIndex for all items
            let zIndex = data.length + 1;
            traverseTree(data, (item) => {
                setLayerZIndex(item.id, zIndex--);
            });
        }
    };

    return { onDrop, allowDrop };
}
