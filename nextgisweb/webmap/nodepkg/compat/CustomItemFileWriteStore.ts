/* eslint-disable @typescript-eslint/no-explicit-any */
import ItemFileWriteStore from "dojo/data/ItemFileWriteStore";

import type {
    StoreGroupConfig,
    StoreItemConfig,
    StoreLayerConfig,
} from "./type";

export interface StoreFetchQuery {
    deep: true;
}
type ArrayWrap<T> = {
    [P in keyof T]: T[P][];
};

interface DojoStoreItem {
    id?: number[];
    _S?: any[];
    _R?: any[];
}

type GetStoreItem<T> = ArrayWrap<T> & DojoStoreItem;

export type StoreItem<I extends StoreItemConfig = StoreItemConfig> =
    GetStoreItem<I>;

export interface StoreFetchOptions {
    sort?:
        | { attribute: keyof StoreItemConfig }
        | Array<{ attribute: keyof StoreItemConfig }>
        | null;
    query?: Partial<StoreItemConfig>;
    queryOptions?: StoreFetchQuery;
    onItem?: (item: StoreItem) => void;
    onComplete?: (items: StoreItem[]) => void;
    onError?: (error: Error) => void;
}

export interface StoreFetchItemByIdentityOptions {
    identity: number;
    onItem: (item: StoreItem | null) => void;
}

export class CustomItemFileWriteStore extends ItemFileWriteStore {
    constructor(options: {
        data: {
            identifier: keyof StoreItemConfig;
            label: keyof StoreItemConfig;
            items: StoreItemConfig[];
        };
    }) {
        super(options);
    }

    save(item: StoreItem) {
        return super.save(item);
    }

    // https://dojotoolkit.org/reference-guide/1.6/dojo/data/api/Write.html#newitem
    newItem<T extends StoreItemConfig = StoreItemConfig>(
        keywordArgs?: T,
        parentInfo?: {
            parent: StoreItem;
            attribute: keyof StoreItemConfig;
        }
    ): StoreItem<T> {
        return super.newItem(keywordArgs, parentInfo) as any;
    }
    // https://dojotoolkit.org/reference-guide/1.6/dojo/data/api/Write.html#deleteitem
    deleteItem(item: StoreItem): boolean {
        return super.deleteItem(item);
    }

    fetch(options: StoreFetchOptions) {
        return super.fetch(options);
    }

    on<K extends keyof StoreLayerConfig>(
        eventName: "Set",
        callback: (
            item: StoreItem,
            attribute: K,
            oldValue: StoreLayerConfig[K],
            newValue: any
        ) => void
    ): { remove: () => void } {
        return super.on(eventName, callback);
    }

    getValue<K extends keyof StoreLayerConfig>(
        item: StoreItem,
        key: K
    ): StoreLayerConfig[K];
    getValue<K extends keyof StoreGroupConfig>(
        item: StoreItem,
        key: K
    ): StoreGroupConfig[K];
    getValue<K extends keyof StoreItemConfig>(
        item: StoreItem,
        key: K
    ): StoreItemConfig[K] {
        return super.getValue(item, key);
    }
    setValue<K extends keyof StoreGroupConfig>(
        item: StoreItem,
        key: K,
        value: StoreGroupConfig[K]
    ): void;
    setValue<K extends keyof StoreLayerConfig>(
        item: StoreItem,
        key: K,
        value: StoreLayerConfig[K]
    ): void;
    setValue<K extends keyof StoreItemConfig>(
        item: StoreItem,
        key: K,
        value: StoreItemConfig[K]
    ): void {
        super.setValue(item, key, value);
    }

    getValues<K extends keyof StoreItem>(
        item: StoreItem,
        attr: K
    ): (StoreItem[K] | StoreItem)[] {
        return super.getValues(item, attr);
    }

    fetchItemByIdentity(options: StoreFetchItemByIdentityOptions) {
        super.fetchItemByIdentity(options);
    }

    getAttributes(item: StoreItem): (keyof StoreItemConfig)[] {
        return super.getAttributes(item);
    }

    isItem(val: unknown): val is StoreItem {
        return super.isItem(val);
    }

    dumpItem(item: StoreItem | null): StoreItemConfig {
        const obj: Record<string, any> = {};

        if (item) {
            const attributes = this.getAttributes(item);
            console.log(attributes);
            if (attributes.length > 0) {
                for (let i = 0; i < attributes.length; i++) {
                    const values = this.getValues(item, attributes[i]);
                    if (values) {
                        if (values.length > 1) {
                            obj[attributes[i]] = [];
                            for (let j = 0; j < values.length; j++) {
                                const value = values[j];

                                if (this.isItem(value)) {
                                    obj[attributes[i]].push(
                                        this.dumpItem(value)
                                    );
                                } else {
                                    obj[attributes[i]].push(value);
                                }
                            }
                        } else {
                            if (this.isItem(values[0])) {
                                obj[attributes[i]] = this.dumpItem(values[0]);
                            } else {
                                obj[attributes[i]] = values[0];
                            }
                        }
                    }
                }
            }
        }

        return obj as StoreItemConfig;
    }
}
