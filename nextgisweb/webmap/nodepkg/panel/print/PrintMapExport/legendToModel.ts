import type { LegendSymbol } from "@nextgisweb/render/type/api";
import type { TreeWebmapItem } from "@nextgisweb/webmap/layers-tree/LayersTree";
import type { LegendRndCoords } from "@nextgisweb/webmap/print-map/type";
import type {
    LegendElement,
    LegendTreeNode,
} from "@nextgisweb/webmap/type/api";

const handleLegendItems = (symbols: LegendSymbol[]): LegendTreeNode[] => {
    return symbols.map((symbol) => {
        return {
            title: symbol.display_name,
            is_group: false,
            is_legend: true,
            icon: symbol.icon.data,
            children: [],
        };
    });
};

const handleWebmapItem = (treeWebmapItem: TreeWebmapItem): LegendTreeNode => {
    const { title } = treeWebmapItem.treeItem;
    const is_group = treeWebmapItem.treeItem.type === "group";

    const treeNode: LegendTreeNode = {
        title,
        is_group,
        is_legend: false,
        children: [],
    };

    if (is_group) {
        const treeNodes = (treeWebmapItem.children as TreeWebmapItem[]).map(
            (item) => {
                return handleWebmapItem(item);
            }
        );
        treeNode.children = treeNodes;
    } else if (treeWebmapItem.treeItem.type === "layer") {
        const legendInfo = treeWebmapItem.treeItem.legendInfo;
        if (legendInfo.symbols) {
            if (legendInfo.single) {
                treeNode.icon = legendInfo.symbols[0].icon.data;
            } else {
                const legendItems = handleLegendItems(legendInfo.symbols);
                treeNode.children = legendItems;
            }
        }
    }

    return treeNode;
};

export const legendItemsToModel = (
    webmapItems: TreeWebmapItem[]
): LegendTreeNode[] => {
    return webmapItems.map((item: TreeWebmapItem) => {
        return handleWebmapItem(item);
    });
};

export const legendToModel = (
    legendItems: LegendTreeNode[],
    { x, y, width, height, legendColumns }: LegendRndCoords
): LegendElement => {
    return {
        x,
        y,
        width,
        height,
        legend_columns: legendColumns,
        legend_items: legendItems,
    };
};
