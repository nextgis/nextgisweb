import LayersTree from "../../layers-tree";
import type { TreeWebmapItem } from "../../layers-tree/LayersTree";
import type WebmapStore from "../../store";
import type { LayerItem } from "../../type/TreeItems";
import { printMapStore } from "../PrintMapStore";
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
            (layersItem.treeItem as LayerItem).legendInfo.open;

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

const filterTreeItems = (store: WebmapStore, layersItems: TreeWebmapItem[]) => {
    const newLayersItems: TreeWebmapItem[] = [];
    const checked = new Set(store.getChecked());
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
    dojoDisplay: display,
    show,
    legendCoords,
    onChange: onChange,
}: LegendPrintMapProps) => {
    if (!show) {
        if (legendCoords.displayed) {
            onChange({ ...legendCoords, displayed: false });
        }
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
                    {...{
                        store: display.webmapStore,
                        onSelect: () => {},
                        setLayerZIndex: () => {},
                        getWebmapPlugins: () => ({}),
                        onReady: () => {},
                        showDropdown: false,
                        draggable: false,
                        checkable: false,
                        selectable: false,
                        showLine: false,
                        expandable: false,
                        onFilterItems: (store, layersItems) => {
                            const filteredItems = filterTreeItems(
                                store,
                                layersItems
                            );
                            printMapStore.webMapItems = filteredItems;
                            return filteredItems;
                        },
                    }}
                />
            </div>
        </RndComp>
    );
};
