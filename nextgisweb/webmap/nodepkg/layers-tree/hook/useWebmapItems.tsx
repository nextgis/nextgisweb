import { useCallback, useMemo } from "react";

import { EditIcon } from "@nextgisweb/gui/icon";

import type { TreeItemConfig } from "../../type/TreeItems";
import type { TreeWebmapItem } from "../LayersTree";

export function useWebmapItems({
    webMapItems,
}: {
    webMapItems: TreeItemConfig[];
}) {
    const handleWebMapItem = useCallback(
        (webMapItem: TreeItemConfig): TreeWebmapItem => {
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
                    if (
                        item.treeItem.type === "layer" &&
                        item.treeItem.editable === true
                    ) {
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
        },
        []
    );

    const preparedWebMapItems = useMemo(() => {
        return webMapItems.map(handleWebMapItem);
    }, [handleWebMapItem, webMapItems]);

    return { preparedWebMapItems };
}
