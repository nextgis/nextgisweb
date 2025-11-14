import { useCallback, useEffect } from "react";

import type { TreeStore } from "@nextgisweb/webmap/store";

import LayersTree from "../../layers-tree";
import type { TreeWebmapItem } from "../../layers-tree/LayersTree";
import RndComp from "../rnd-comp";
import type { LegendPrintMapProps, RndCoords } from "../type";

const handleTreeItem = (
    checked: Set<number>,
    expanded: Set<number>,
    layersItem: TreeWebmapItem
) => {
    const { key } = layersItem;

    if (layersItem.isLeaf) {
        if (!checked.has(key)) {
            return null;
        }

        const hasLegend =
            layersItem.legendIcon ||
            (layersItem.treeItem.isLayer() &&
                layersItem.treeItem.legendInfo.open);

        if (hasLegend) {
            return layersItem;
        } else {
            return null;
        }
    }

    if (layersItem.children && expanded.has(key)) {
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
    const checked = new Set(store.visibleLayerIds);
    const expanded = new Set(store.expanded);
    layersItems.forEach((item) => {
        const newTreeItem = handleTreeItem(checked, expanded, item);
        if (newTreeItem) {
            newLayersItems.push(newTreeItem);
        }
    });
    return newLayersItems;
};

export const LegendPrintMap = ({
    show,
    display,
    legendCoords,
    printMapStore,
    onChange,
}: LegendPrintMapProps) => {
    const { treeStore } = display;
    const { visibleLayers } = treeStore;

    useEffect(() => {
        if (!show) {
            if (legendCoords.displayed) {
                onChange({ ...legendCoords, displayed: false });
            }
        }
    }, [legendCoords, onChange, show]);

    useEffect(() => {
        if (show) {
            const visibleLayersWithoutSymbols = visibleLayers.filter(
                treeStore.shouldHaveLegendInfo
            );
            if (visibleLayersWithoutSymbols.length) {
                treeStore.updateResourceLegendSymbols(
                    visibleLayersWithoutSymbols.map((layer) => layer.styleId)
                );
            }
        }
    }, [show, treeStore, visibleLayers]);

    const fakeCb = useCallback(() => {}, []);
    const onFilterItems = useCallback(
        (store: TreeStore, layersItems: TreeWebmapItem[]) => {
            const filteredItems = filterTreeItems(store, layersItems);
            printMapStore.setWebMapItems(filteredItems);
            return filteredItems;
        },
        [printMapStore]
    );

    if (!show) {
        return null;
    }

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
