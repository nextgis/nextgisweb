import { makeAutoObservable, runInAction, toJS } from "mobx";

import type {
    CustomItemFileWriteStore,
    StoreItem,
    WebmapItem,
    WebmapLayer,
} from "../type";
import type { TreeItem } from "../type/TreeItems";

export class WebmapStore {
    _webmapItems: StoreItem[] = [];
    _checked: number[] = [];
    _expanded: number[] = [];

    _itemStore: CustomItemFileWriteStore;
    _layers: Record<number, WebmapLayer> = {};

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
                if (attr === "checked" || attr === "visibility") {
                    const id = itemStore.getValue(item, "id");
                    if (
                        attr === "checked" &&
                        itemStore.getValue(item, "type") === "layer"
                    ) {
                        this._itemStoreVisibility(item);
                    } else if (attr === "visibility") {
                        const layer = this._layers[id];
                        if (layer) {
                            layer.set("visibility", newVal as any);
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
        runInAction(() => {
            this._checked = checked_;
        });
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
        const itemStore = this._itemStore;
        itemStore.fetch({
            query: { type: "layer" },
            queryOptions: { deep: true },
            onItem: (item: StoreItem) => {
                const id = itemStore.getValue(item, "id");
                const newValue = checkedKeysValue.includes(id);
                const oldValue = itemStore.getValue(item, "checked");
                if (newValue !== oldValue) {
                    itemStore.setValue(item, "checked", newValue);
                }
            },
        });
    };

    getIds = ({ query }: { query?: Record<string, unknown> } = {}) => {
        const itemStore = this._itemStore;
        return new Promise((resolve) => {
            itemStore.fetch({
                query,
                queryOptions: { deep: true },
                onComplete: function (items: StoreItem[]) {
                    resolve(
                        items.map((item) => itemStore.getValue(item, "id"))
                    );
                },
            });
        });
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

    addItem = (item: WebmapItem) => {
        const items = [item, ...this._webmapItems];
        if (item.visibility) {
            this._checked = [...this._checked, item.id];
        }
        this._webmapItems = items;
    };

    setWebmapItems = (items: StoreItem[]) => {
        this._webmapItems = items;
    };

    setChecked = (checked: number[]) => {
        this._checked = checked;
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
