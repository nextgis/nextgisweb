import type { LegendTreeNode } from "@nextgisweb/webmap/type/api";

import type { TreeWebmapItem } from "../../../layers-tree/LayersTree";
import type { SymbolInfo } from "../../../type/TreeItems";

const handleLegendItems = (symbols: SymbolInfo[]): LegendTreeNode[] => {
    return symbols.map((symbol) => {
        return {
            title: symbol.display_name,
            isGroup: false,
            isLegend: true,
            icon: symbol.icon.data,
            children: [],
        };
    });
};

const handleWebmapItem = (treeWebmapItem: TreeWebmapItem): LegendTreeNode => {
    const { title } = treeWebmapItem.treeItem;
    const isGroup = treeWebmapItem.treeItem.type === "group";

    const treeNode: LegendTreeNode = {
        title,
        isGroup,
        isLegend: false,
        children: [],
    };

    if (isGroup) {
        const treeNodes = (treeWebmapItem.children as TreeWebmapItem[]).map(
            (item) => {
                return handleWebmapItem(item);
            }
        );
        treeNode.children = treeNodes;
    } else if (treeWebmapItem.treeItem.type === "layer") {
        const legendInfo = treeWebmapItem.treeItem.legendInfo;
        if (legendInfo.single) {
            treeNode.icon = legendInfo.symbols[0].icon.data;
        } else {
            const legendItems = handleLegendItems(legendInfo.symbols);
            treeNode.children = legendItems;
        }
    }

    return treeNode;
};

export const legendToModel = (
    webmapItems: TreeWebmapItem[]
): LegendTreeNode[] => {
    return webmapItems.map((item: TreeWebmapItem) => {
        return handleWebmapItem(item);
    });
};
