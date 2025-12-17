import { useCallback, useEffect } from "react";

import type { TreeStore } from "@nextgisweb/webmap/store";

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

const filterTreeItems = (store: TreeStore, layersItems: TreeWebmapItem[]) => {
    const newLayersItems: TreeWebmapItem[] = [];

    layersItems.forEach((item) => {
        const newTreeItem = handleTreeItem(
            store.visibleLayerIds,
            store.expanded,
            item
        );
        if (newTreeItem) {
            newLayersItems.push(newTreeItem);
        }
    });
    return newLayersItems;
};

export const LegendPrintMap = ({
    display,
    legendCoords,
    printMapStore,
    onChange,
}: LegendPrintMapProps) => {
    const { treeStore } = display;
    const { visibleLayers } = treeStore;

    useEffect(() => {
        if (legendCoords.displayed) {
            onChange({ ...legendCoords, displayed: false });
        }
    }, [legendCoords, onChange]);

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

    const fakeCb = useCallback(() => {}, []);
    const onFilterItems = useCallback(
        (store: TreeStore, layersItems: TreeWebmapItem[]) => {
            const filteredItems = filterTreeItems(store, layersItems);
            printMapStore.setWebMapItems(filteredItems);
            return filteredItems;
        },
        [printMapStore]
    );

    const style = { columnCount: legendCoords.legendColumns };

    return (
        <RndComp
            coords={legendCoords}
            onChange={(rndCoords: RndCoords) => {
                const { legendColumns } = legendCoords;
                onChange({ ...rndCoords, displayed: true, legendColumns });
            }}
            className="legend-rnd"
            displayed
        >
            <div className="legend" style={style}>
                <LayersTree
                    store={treeStore}
                    onReady={fakeCb}
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
};
