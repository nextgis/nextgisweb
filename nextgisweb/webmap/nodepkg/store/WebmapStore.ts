import { makeAutoObservable, runInAction, toJS } from "mobx";

import { getChildrenDeep, traverseTree } from "@nextgisweb/gui/util/tree";

import { keyInMutuallyExclusiveGroupDeep } from "../layers-tree/util/treeItems";
import type {
    CustomItemFileWriteStore,
    StoreItem,
    WebmapItem,
    WebmapLayer,
} from "../type";
import type { TreeItem } from "../type/TreeItems";

type LegendSymbols = { [layerId: number]: { [symbolIndex: number]: boolean } };

export class WebmapStore {
    _webmapItems: StoreItem[] = [];
    _checked: number[] = [];
    _expanded: number[] = [];

    _itemStore: CustomItemFileWriteStore;
    _layers: Record<number, WebmapLayer> = {};
    _legendSymbols: LegendSymbols = {};

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
        makeAutoObservable(this, { _itemStore: false, _layers: false });

        itemStore.on(
            "Set",
            (
                item: StoreItem,
                attr: keyof WebmapItem,
                oldVal: unknown,
                newVal: unknown
            ) => {
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
                            layer.set("symbols", newVal as string);
                        }
                    }
                }
            }
        );
    }

    get webmapItems() {
        return [...this._webmapItems];
    }

    get checked() {
        return [...this._checked];
    }

    get expanded() {
        return [...this._expanded];
    }

    getWebmapItems(): TreeItem[] {
        return toJS(this._webmapItems as TreeItem[]);
    }

    _setChecked = (id: number, newVal: boolean, oldVal?: boolean) => {
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
            if (store.getValue(item, "visibility") !== newVal) {
                const id = store.getValue(item, "id");
                console.log(`Layer ${id} visibility has changed to ${newVal}`);
                store.setValue(item, "visibility", newVal);
                this._setChecked(id, newVal);
            }
        }
    };

    handleCheckChanged = (checkedKeysValue: number[]) => {
        this.setChecked(checkedKeysValue);
        this._updateLayersVisibility(this._checked);
    };

    _prepareChecked = (checkedKeysValue: number[]) => {
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

    _updateLayersVisibility = (checkedKeys: number[]) => {
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
        const layerSymbols = layer.itemConfig.legendInfo.symbols;

        const needSymbolRender = Object.entries(symbols).some(
            ([index, renderStatus]) => {
                const layerSymbol = layerSymbols.find(
                    (l) => l.index === Number(index)
                );
                return layerSymbol && layerSymbol.render !== renderStatus;
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
            onItem: (item: StoreItem) => {
                this._itemStore.setValue(item, "symbols", intervals);
            },
        });
    };

    _consolidateIntervals = (symbols: number[]) => {
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

    filterLayers = ({ query }: { query?: Partial<StoreItem> } = {}) => {
        const itemStore = this._itemStore;
        return new Promise<StoreItem[]>((resolve) => {
            itemStore.fetch({
                query,
                queryOptions: { deep: true },
                onComplete: function (items: StoreItem[]) {
                    resolve([...items]);
                },
            });
        });
    };

    getIds = (options: { query?: Partial<StoreItem> } = {}) => {
        const itemStore = this._itemStore;
        return this.filterLayers(options).then((items) =>
            items.map((item) => itemStore.getValue(item, "id"))
        );
    };

    getLayers() {
        return this._layers;
    }

    getLayer(id: number) {
        return this._layers[id];
    }

    addLayer(id: number, layer: WebmapLayer) {
        this._layers[id] = layer;
    }

    addItem = (item: StoreItem) => {
        const items = [item, ...this._webmapItems];
        if ("visibility" in item && item.visibility) {
            this.setChecked([...this._checked, item.id]);
        }
        this._webmapItems = items;
    };

    removeItem = (id: number) => {
        this.setChecked(this._checked.filter((checkedId) => checkedId !== id));
        traverseTree(this._webmapItems, (item, index, arr) => {
            if (item.id === id) {
                arr.splice(index, 1);
                return true;
            }
        });
        this._webmapItems = [...this._webmapItems];
        delete this._layers[id];
    };

    setWebmapItems = (items: StoreItem[]) => {
        this._webmapItems = items;
        this.setChecked(this._checked);
    };

    setChecked = (checked: number[]) => {
        const updatedCheckedKeys = this._prepareChecked(checked);
        this._checked = updatedCheckedKeys;
    };

    getChecked = () => {
        return this._checked;
    };

    setExpanded = (expanded: number[]) => {
        this._expanded = expanded;
    };

    getLayerVisibility = (layerId: number) => {
        return this._checked.includes(layerId);
    };

    getLayerOpacity = (layerId: number) => {
        const layer = this._layers[layerId];
        return layer ? layer.get("opacity") : 1;
    };

    setLayerOpacity = (layerId: number, opacity: number) => {
        const layer = this._layers[layerId];
        if (layer) {
            layer.set("opacity", opacity);
        }
    };
}
