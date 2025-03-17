import { action, computed, observable, runInAction, toJS } from "mobx";

import { getChildrenDeep, traverseTree } from "@nextgisweb/gui/util/tree";
import { route } from "@nextgisweb/pyramid/api";
import type { LegendSymbol } from "@nextgisweb/render/type/api";
import type { LayerItemConfig, LegendInfo } from "@nextgisweb/webmap/type/api";

import type {
    CustomItemFileWriteStore,
    StoreItem,
} from "../compat/CustomItemFileWriteStore";
import type { StoreItemConfig } from "../compat/type";
import { keyInMutuallyExclusiveGroupDeep } from "../layers-tree/util/treeItems";
import type { CoreLayer } from "../ol/layer/CoreLayer";
import type { TreeChildrenItemConfig, TreeItemConfig } from "../type/TreeItems";

type LegendSymbols = { [layerId: string]: { [symbolIndex: number]: boolean } };

export class WebmapStore {
    @observable.shallow private accessor _webmapItems: TreeItemConfig[] = [];
    @observable.shallow private accessor _checked: number[] = [];
    @observable.shallow private accessor _expanded: number[] = [];
    @observable.shallow accessor _legendSymbols: LegendSymbols = {};

    private _itemStore: CustomItemFileWriteStore;
    @observable.shallow private accessor _layers: Record<string, CoreLayer> =
        {};

    private readonly _loadingResourceSymbols = new Set<number>();

    constructor({
        itemStore,
        checked,
    }: {
        itemStore: CustomItemFileWriteStore;
        checked?: number[];
    }) {
        this._itemStore = itemStore;
        if (Array.isArray(checked)) {
            this._checked = checked;
        }

        itemStore.on("Set", (item, attr, _oldVal, newVal) => {
            if (
                attr === "checked" ||
                attr === "visibility" ||
                attr === "symbols"
            ) {
                const id = itemStore.getValue(item, "id");
                if (
                    attr === "checked" &&
                    itemStore.getValue(item, "type") === "layer"
                ) {
                    this._itemStoreVisibility(item);
                } else if (attr === "visibility") {
                    const layer = this._layers[id];
                    if (layer) {
                        layer.set("visibility", newVal as boolean);
                    }
                } else if (attr === "symbols") {
                    const layer = this._layers[id];
                    if (layer) {
                        layer.set("symbols", newVal as string[]);
                    }
                }
            }
        });
    }

    @computed
    get webmapItems() {
        return [...this._webmapItems];
    }

    @computed
    get checked() {
        return [...this._checked];
    }

    @computed
    get expanded() {
        return [...this._expanded];
    }

    getWebmapItems(): TreeItemConfig[] {
        return toJS(this._webmapItems);
    }

    @action
    private _setChecked = (id: number, newVal: boolean, oldVal?: boolean) => {
        const checked_ = [...this._checked];
        if (newVal) {
            if (!checked_.includes(id)) {
                checked_.push(id);
            }
        } else if (oldVal !== newVal) {
            const index = checked_.indexOf(id);
            if (index !== -1) {
                checked_.splice(index, 1);
            }
        }
        this._checked = checked_;
    };

    _itemStoreVisibility = (item: StoreItem) => {
        const store = this._itemStore;

        if (store.getValue(item, "type") === "layer") {
            const newVal = store.getValue(item, "checked");
            if (!!store.getValue(item, "visibility") !== newVal) {
                const id = store.getValue(item, "id");
                store.setValue(item, "visibility", newVal);
                this._setChecked(id, newVal);
            }
        }
    };

    handleCheckChanged = (checkedKeysValue: number[]) => {
        this.setChecked(checkedKeysValue);
        this._updateLayersVisibility(this._checked);
    };

    private _prepareChecked = (checkedKeysValue: number[]) => {
        const updatedCheckedKeys = [];
        const skip: number[] = [];

        for (const key of checkedKeysValue) {
            if (skip.includes(key)) {
                continue;
            }
            const parents = keyInMutuallyExclusiveGroupDeep(
                key,
                this._webmapItems
            );

            if (parents) {
                const firstParent = parents[0];
                const mutualGroup = parents[parents.length - 1];
                const mutualItems = getChildrenDeep(mutualGroup);
                const mutualKeys = mutualItems.map((m) => m.key);
                skip.push(...mutualKeys);

                if (firstParent.type === "group" && !firstParent.exclusive) {
                    updatedCheckedKeys.push(
                        ...firstParent.children
                            .map((c) => c.key)
                            .filter((k) => checkedKeysValue.includes(k))
                    );
                } else {
                    updatedCheckedKeys.push(key);
                }
            } else {
                updatedCheckedKeys.push(key);
            }
        }

        return updatedCheckedKeys;
    };

    private _updateLayersVisibility = (checkedKeys: number[]) => {
        this._itemStore.fetch({
            query: { type: "layer" },
            queryOptions: { deep: true },
            onItem: (item: StoreItem) => {
                const id = this._itemStore.getValue(item, "id");
                const newValue = checkedKeys.includes(id);
                const oldValue = this._itemStore.getValue(item, "checked");
                if (newValue !== oldValue) {
                    this._itemStore.setValue(item, "checked", newValue);
                }
            },
        });
    };

    setLayerLegendSymbol = (
        identity: number,
        symbolIndex: number,
        status: boolean
    ) => {
        const symbols = { ...(this._legendSymbols[identity] || {}) };
        symbols[symbolIndex] = status;
        runInAction(() => {
            this._legendSymbols[identity] = symbols;
        });
        const layer = this.getLayer(identity);
        if (layer.itemConfig) {
            const layerSymbols = layer.itemConfig.legendInfo?.symbols;
            if (layerSymbols) {
                const needSymbolRender = Object.entries(symbols).some(
                    ([index, renderStatus]) => {
                        const layerSymbol = layerSymbols.find(
                            (l) => l.index === Number(index)
                        );
                        return (
                            layerSymbol && layerSymbol.render !== renderStatus
                        );
                    }
                );

                // -1 - do not show nothing, null - use default render without symbols
                let intervals: string[] | "-1" | null = null;
                if (needSymbolRender) {
                    const renderIndexes: number[] = [];
                    for (const s of layerSymbols) {
                        const render = symbols[s.index] ?? s.render;
                        if (render) {
                            renderIndexes.push(s.index);
                        }
                    }
                    intervals = this._consolidateIntervals(renderIndexes);
                    intervals = intervals.length ? intervals : "-1";
                }
                this._itemStore.fetchItemByIdentity({
                    identity,
                    onItem: (item) => {
                        if (item) {
                            this._itemStore.setValue(
                                item,
                                "symbols",
                                intervals
                            );
                        }
                    },
                });
            }
        }
    };

    private _consolidateIntervals = (symbols: number[]) => {
        const sortedSymbols = symbols.slice().sort((a, b) => a - b);
        const intervals = [];
        let start = sortedSymbols[0];
        let end = start;

        for (let i = 1; i <= sortedSymbols.length; i++) {
            if (sortedSymbols[i] === end + 1) {
                end = sortedSymbols[i];
            } else {
                intervals.push(start === end ? `${start}` : `${start}-${end}`);
                start = sortedSymbols[i];
                end = start;
            }
        }

        return intervals;
    };

    filterLayers = ({ query }: { query?: Partial<StoreItemConfig> } = {}) => {
        const itemStore = this._itemStore;
        return new Promise<StoreItemConfig[]>((resolve) => {
            itemStore.fetch({
                query,
                queryOptions: { deep: true },
                onComplete: (items) => {
                    resolve(items.map((item) => itemStore.dumpItem(item)));
                },
            });
        });
    };

    getIds = (options: { query?: Partial<StoreItemConfig> } = {}) => {
        return this.filterLayers(options).then((items) =>
            items.map((item) => item.id)
        );
    };

    @computed
    get layers() {
        return this._layers;
    }

    getLayers() {
        return this._layers;
    }

    getLayer(id: number) {
        return this._layers[id];
    }

    @action
    addLayer(id: number, layer: CoreLayer) {
        this._layers = { ...this._layers, [id]: layer };
    }

    @action
    addItem = (item: TreeChildrenItemConfig) => {
        const items = [item, ...this._webmapItems];
        if ("visibility" in item && item.visibility) {
            this.setChecked([...this._checked, item.id]);
        }
        this._webmapItems = items;
    };

    @action
    removeItem = (id: number) => {
        this.setChecked(this._checked.filter((cid) => cid !== id));
        traverseTree(this._webmapItems, (item, index, arr) => {
            if (item.id === id) {
                arr.splice(index, 1);
                return true;
            }
        });
        this._webmapItems = [...this._webmapItems];
        delete this._layers[id];
    };

    @action
    setWebmapItems = (items: TreeItemConfig[]) => {
        this._webmapItems = items;
        this.setChecked(this._checked);
    };

    @action
    setChecked = (checked: number[]) => {
        const updatedCheckedKeys = this._prepareChecked(checked);
        this._checked = updatedCheckedKeys;
    };

    getChecked = () => {
        return this._checked;
    };

    @action
    setExpanded = (expanded: number[]) => {
        this._expanded = expanded;
    };

    @computed
    get visibleLayers(): LayerItemConfig[] {
        const visibleLayers: LayerItemConfig[] = [];

        traverseTree(this._webmapItems, (item) => {
            if (item.type === "layer" && this.getLayerVisibility(item.id)) {
                visibleLayers.push(item);
            }
        });

        return visibleLayers;
    }

    @computed
    get layersInExpandedGroups(): LayerItemConfig[] {
        const layers: LayerItemConfig[] = [];

        const traverse = (items: TreeItemConfig[], parentExpanded: boolean) => {
            for (const item of items) {
                if (item.type === "group") {
                    const isExpanded = this._expanded.includes(item.id);
                    if (isExpanded && parentExpanded) {
                        traverse(item.children || [], true);
                    } else {
                        traverse(item.children || [], false);
                    }
                } else if (item.type === "layer") {
                    if (parentExpanded) {
                        layers.push(item);
                    }
                }
            }
        };

        traverse(this._webmapItems, true);
        return layers;
    }

    shouldHaveLegendInfo = (layer: LayerItemConfig) => {
        return (
            !this._loadingResourceSymbols.has(layer.styleId) &&
            layer.legendInfo.has_legend &&
            (layer.legendInfo.symbols === null ||
                layer.legendInfo.symbols === undefined)
        );
    };

    @computed
    get layersWithoutLegendInfo(): LayerItemConfig[] {
        return this.layersInExpandedGroups.filter(this.shouldHaveLegendInfo);
    }

    @action.bound
    async updateResourceLegendSymbols(resources: number[]) {
        if (resources.length) {
            const newResources = resources.filter(
                (id) => !this._loadingResourceSymbols.has(id)
            );
            if (!newResources.length) return;

            try {
                newResources.forEach((id) =>
                    this._loadingResourceSymbols.add(id)
                );
                const legends = await route(
                    "render.resource_legend_symbols"
                ).get({
                    query: { resources: newResources, icon_size: 20 },
                    cache: true,
                });
                legends.items.forEach(({ resource, legend_symbols }) => {
                    this.updateLayerLegendInfo(resource.id, legend_symbols);
                });
            } catch (error) {
                console.error(
                    "Error fetching render.resource_legend_symbols:",
                    error
                );
            } finally {
                newResources.forEach((id) =>
                    this._loadingResourceSymbols.delete(id)
                );
            }
        }
    }

    @action
    private updateLayerLegendInfo(styleId: number, symbols?: LegendSymbol[]) {
        const webmapItems = [...this._webmapItems];
        const layers = { ...this._layers };
        let updated = false;
        traverseTree(webmapItems, (item) => {
            if (
                item.type === "layer" &&
                item.styleId === styleId &&
                item.legendInfo.has_legend &&
                !item.legendInfo.symbols
            ) {
                updated = true;
                const single = !!symbols && symbols.length === 1;
                const legendInfo: LegendInfo = {
                    ...item.legendInfo,
                    symbols: symbols ?? [],
                    single,
                };
                if (!single) {
                    legendInfo.open = legendInfo.visible === "expand";
                }
                item.legendInfo = legendInfo;

                for (const layer of Object.values(layers)) {
                    if (
                        layer.itemConfig &&
                        layer.itemConfig.styleId === styleId
                    ) {
                        layer.itemConfig.legendInfo = legendInfo;
                    }
                }

                return true;
            }
            return false;
        });
        if (updated) {
            this._layers = layers;
            this._webmapItems = webmapItems;
        }
    }

    getLayerVisibility = (layerId: number) => {
        return this._checked.includes(layerId);
    };

    getLayerOpacity = (layerId: number) => {
        const layer = this._layers[layerId];
        return layer ? layer.opacity : 1;
    };

    @action
    setLayerOpacity = (layerId: number, opacity: number) => {
        const layer = this._layers[layerId];
        if (layer) {
            layer.setOpacity(opacity);
        }
    };
}
