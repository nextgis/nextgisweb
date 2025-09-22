import { findNode } from "@nextgisweb/gui/util/tree";
import type { WebmapStore } from "@nextgisweb/webmap/store";

export function setItemsEditable(
    webmapStore: WebmapStore,
    itemIds: number[],
    status: boolean
): number[] {
    const webmapItems = [...webmapStore.webmapItems];

    const changed: number[] = [];

    for (const id of itemIds) {
        const editableItem = findNode(webmapItems, (item) => item.id === id);
        if (
            editableItem &&
            editableItem.type === "layer" &&
            editableItem.editable !== status
        ) {
            editableItem.editable = status;
            changed.push(id);
        }
    }

    if (changed.length > 0) {
        webmapStore.setWebmapItems(webmapItems);
    }

    return changed;
}
