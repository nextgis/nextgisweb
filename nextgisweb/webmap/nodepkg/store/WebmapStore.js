import { makeAutoObservable, runInAction } from "mobx";

export class WebmapStore {
    _webmapItems = [];
    _checked = [];
    _expanded = [];

    _itemStore = null;
    _layers = {};

    constructor({ itemStore, checked }) {
        this._itemStore = itemStore;
        if (Array.isArray(checked)) {
            this._checked = checked;
        }
        makeAutoObservable(this, { _itemStore: false, _layers: false });

        itemStore.on("Set", (item, attr, oldVal, newVal) => {
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
                        layer.set("visibility", newVal);
                    }
                }
            }
        });
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

    _setChecked = (id, newVal, oldVal) => {
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

    _itemStoreVisibility = (item) => {
        const store = this._itemStore;

        if (store.getValue(item, "type") === "layer") {
            var newVal = store.getValue(item, "checked");
            if (store.getValue(item, "visibility") !== newVal) {
                const id = store.getValue(item, "id");
                console.log(
                    "Layer [%s] visibility has changed to [%s]",
                    id,
                    newVal
                );
                store.setValue(item, "visibility", newVal);
                this._setChecked(id, newVal);
            }
        }
    };

    handleCheckChanged = (checkedKeysValue) => {
        const itemStore = this._itemStore;
        itemStore.fetch({
            query: { type: "layer" },
            queryOptions: { deep: true },
            onItem: (item) => {
                const id = itemStore.getValue(item, "id");
                const newValue = checkedKeysValue.includes(id);
                const oldValue = itemStore.getValue(item, "checked");
                if (newValue !== oldValue) {
                    itemStore.setValue(item, "checked", newValue);
                }
            },
        });
    };

    getIds = ({ query } = {}) => {
        const itemStore = this._itemStore;
        return new Promise((resolve) => {
            itemStore.fetch({
                query,
                queryOptions: { deep: true },
                onComplete: function (items) {
                    resolve(
                        items.map((item) => itemStore.getValue(item, "id"))
                    );
                },
            });
        });
    };

    addItem = (item) => {
        const items = [item, ...this._webmapItems];
        if (item.visibility) {
            this._checked = [...this._checked, item.id];
        }
        this._webmapItems = items;
    };

    setWebmapItems = (items) => {
        this._webmapItems = items;
    };

    setChecked = (checked) => {
        this._checked = checked;
    };

    setExpanded = (expanded) => {
        this._expanded = expanded;
    };
}
