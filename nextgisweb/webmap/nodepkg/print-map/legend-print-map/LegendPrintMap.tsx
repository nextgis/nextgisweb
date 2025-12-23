import { observer } from "mobx-react-lite";
import { useCallback, useEffect } from "react";

import LayersTree from "../../layers-tree";
import type { TreeWebmapItem } from "../../layers-tree/LayersTree";
import RndComp from "../rnd-comp";
import type { LegendPrintMapProps, RndCoords } from "../type";

const handleTreeItem = (
    checked: number[],
    expanded: number[],
    layersItem: TreeWebmapItem
) => {
    const { key } = layersItem;

    if (layersItem.isLeaf) {
        if (!checked.includes(key)) {
            return null;
        }

        const legendInfo =
            layersItem.treeItem.isLayer() && layersItem.treeItem.legendInfo;

        const hasLegend =
            legendInfo &&
            (legendInfo.open || legendInfo.single) &&
            legendInfo.symbols;

        if (hasLegend) {
            return layersItem;
        } else {
            return null;
        }
    }

    if (layersItem.children && expanded.includes(key)) {
        const newLayersItems: TreeWebmapItem[] = [];
        (layersItem.children as TreeWebmapItem[]).forEach((item) => {
            const newTreeItem = handleTreeItem(checked, expanded, item);
            if (newTreeItem) {
                newLayersItems.push(newTreeItem);
            }
        });
        layersItem.children = newLayersItems;
        return layersItem.children.length ? layersItem : null;
    }
};

export const LegendPrintMap = observer(
    ({ display, legendCoords, printMapStore }: LegendPrintMapProps) => {
        const { treeStore } = display;
        const { visibleLayers, visibleInRangeIds, expanded } = treeStore;

        useEffect(() => {
            const visibleLayersWithoutSymbols = visibleLayers.filter(
                treeStore.shouldHaveLegendInfo
            );
            if (visibleLayersWithoutSymbols.length) {
                treeStore.updateResourceLegendSymbols(
                    visibleLayersWithoutSymbols.map((layer) => layer.styleId)
                );
            }
        }, [treeStore, visibleLayers]);

        const filterTreeItems = useCallback(
            (layersItems: TreeWebmapItem[]) => {
                const newLayersItems: TreeWebmapItem[] = [];

                layersItems.forEach((item) => {
                    const newTreeItem = handleTreeItem(
                        visibleInRangeIds,
                        expanded,
                        item
                    );
                    if (newTreeItem) {
                        newLayersItems.push(newTreeItem);
                    }
                });
                return newLayersItems;
            },
            [expanded, visibleInRangeIds]
        );

        const onFilterItems = useCallback(
            (layersItems: TreeWebmapItem[]) => {
                const filteredItems = filterTreeItems(layersItems);
                printMapStore.setWebMapItems(filteredItems);
                return filteredItems;
            },
            [filterTreeItems, printMapStore]
        );

        const style = { columnCount: legendCoords.legendColumns };

        return (
            <RndComp
                coords={legendCoords}
                onChange={(rndCoords: RndCoords) => {
                    const { legendColumns } = legendCoords;

                    printMapStore.layout.updateCoordinates("legendCoords", {
                        ...rndCoords,
                        displayed: true,
                        legendColumns,
                    });
                }}
                className="legend-rnd"
                displayed
            >
                <div className="legend" style={style}>
                    <LayersTree
                        store={treeStore}
                        showDropdown={false}
                        draggable={false}
                        checkable={false}
                        selectable={false}
                        showLine={false}
                        expandable={false}
                        onFilterItems={onFilterItems}
                    />
                </div>
            </RndComp>
        );
    }
);

LegendPrintMap.displayName = "LegendPrintMap";
