import { makeAutoObservable } from "mobx";

export class WebmapStore {
    _webmapItems = [];
    _checked = [];
    _expanded = [];

    _itemStore = null;

    constructor({ itemStore, checked }) {
        this._itemStore = itemStore;
        this._checked = checked;
        makeAutoObservable(this, { _itemStore: false });
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

    handleCheckChanged = (checkedKeysValue) => {
        const itemStore = this._itemStore;
        itemStore.fetch({
            query: { type: "layer" },
            queryOptions: { deep: true },
            onItem: (item) => {
                itemStore.setValue(
                    item,
                    "checked",
                    checkedKeysValue.includes(itemStore.getValue(item, "id"))
                );
            },
        });
        this._checked = checkedKeysValue;
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
