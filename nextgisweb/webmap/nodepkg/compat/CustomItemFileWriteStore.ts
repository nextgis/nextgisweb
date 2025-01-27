/* eslint-disable @typescript-eslint/no-explicit-any */

import { gettext } from "@nextgisweb/pyramid/i18n";

import { EventEmitter } from "./EventEmitter";
import type {
    StoreGroupConfig,
    StoreItemConfig,
    StoreLayerConfig,
    StoreRootConfig,
} from "./type";

export interface StoreFetchQuery {
    // @deprecated because it is always true
    deep: true;
}

type CustomStoreItem = StoreItemConfig & {
    __parentId: number | null;
};

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

export type StoreItem<I extends StoreItemConfig = StoreItemConfig> = I &
    CustomStoreItem;

export class CustomItemFileWriteStore extends EventEmitter {
    private items: Map<number, CustomStoreItem> = new Map();

    constructor(options: {
        data: {
            // @deprecated always id
            identifier: "id";
            // @deprecated always label
            label: "label";
            items: StoreItemConfig[];
        };
    }) {
        super();
        options.data.items.forEach((itemConfig) => {
            this.traverseAndAdd(null, itemConfig);
        });
    }

    private traverseAndAdd(
        parentId: number | null,
        itemConfig: StoreItemConfig
    ): void {
        const itemId = itemConfig["id"];
        if (itemId === null) {
            throw new Error("Item has no valid identifier");
        }
        const newItem: CustomStoreItem = {
            ...itemConfig,
            id: Number(itemId),
            __parentId: parentId,
        };
        this.items.set(itemId, newItem);

        this.emit("Set", newItem, "newItem", null, newItem);

        if (this.isGroupOrRoot(newItem)) {
            newItem.children.forEach((childConfig) => {
                this.traverseAndAdd(newItem.id, childConfig);
            });
        }
    }

    private isGroupOrRoot(
        item: StoreItemConfig
    ): item is StoreGroupConfig | StoreRootConfig {
        return item.type === "group" || item.type === "root";
    }

    newItem<T extends StoreItemConfig = StoreItemConfig>(
        keywordArgs?: T,
        parentInfo?: {
            parent: StoreItem;
            attribute: keyof StoreItemConfig;
        }
    ): StoreItem<T> {
        const parentId = parentInfo ? parentInfo.parent.id : null;
        const newId = this.getlastId() + 1;
        const newItemConfig = keywordArgs
            ? { ...keywordArgs, id: keywordArgs.id }
            : ({
                  id: newId,
                  type: "layer",
                  label: `${gettext("New layer")}: ${newId}`,
                  position: null,
              } as T);

        const newItem = this.addItem(parentId, newItemConfig);

        this.emit("Set", newItem, "newItem", null, newItem);

        return newItem;
    }

    private getlastId() {
        return Math.max(...Array.from(this.items.keys()));
    }

    private addItem(
        parentId: number | null,
        itemConfig: StoreItemConfig
    ): CustomStoreItem {
        const itemId = itemConfig.id ?? this.getlastId() + 1;
        const newItem: CustomStoreItem = {
            ...itemConfig,
            id: itemId,
            __parentId: parentId,
        };
        this.items.set(itemId, newItem);
        return newItem;
    }

    deleteItem(item: StoreItem): boolean {
        if (!this.isItem(item)) {
            throw new Error("Invalid item");
        }
        const storeItem = item;

        // Recursively delete all descendants
        const deleteRecursively = (itemId: number) => {
            const children = this.getChildren(itemId);
            children.forEach((child) => deleteRecursively(child.id));
            const deletedItem = this.items.get(itemId);
            this.items.delete(itemId);
            this.emit("Set", deletedItem, "deleteItem", deletedItem, null);
        };

        deleteRecursively(storeItem.id);

        return true;
    }

    fetch(options: StoreFetchOptions) {
        try {
            let results: CustomStoreItem[] = Array.from(this.items.values());

            if (options.query) {
                results = results.filter((item) => {
                    return Object.entries(options.query!).every(
                        ([key, value]) => {
                            return (item as any)[key] === value;
                        }
                    );
                });
            }

            if (options.sort) {
                const sortAttributes = Array.isArray(options.sort)
                    ? options.sort
                    : [options.sort];
                results.sort((a, b) => {
                    for (const sortOption of sortAttributes) {
                        const attr = sortOption.attribute;
                        if ((a as any)[attr] < (b as any)[attr]) return -1;
                        if ((a as any)[attr] > (b as any)[attr]) return 1;
                    }
                    return 0;
                });
            }

            if (options.queryOptions?.deep) {
                // have no sense because it is always true
            }

            if (options.onItem) {
                results.forEach(options.onItem);
            }

            if (options.onComplete) {
                options.onComplete(results);
            }
        } catch (error) {
            if (options.onError) {
                options.onError(error as Error);
            }
        }
    }

    on<K extends keyof StoreLayerConfig>(
        eventName: "Set",
        callback: (
            item: StoreItem,
            attribute: K,
            oldValue: StoreLayerConfig[K],
            newValue: StoreLayerConfig[K]
        ) => void
    ): { remove: () => void } {
        return super.on(
            eventName,
            (
                item: CustomStoreItem,
                attribute: string,
                oldValue: StoreLayerConfig[K],
                newValue: StoreLayerConfig[K]
            ) => {
                callback(item, attribute as K, oldValue, newValue);
            }
        );
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
        if (!this.isItem(item)) {
            throw new Error("Invalid item");
        }
        return item[key];
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
        if (!this.isItem(item)) {
            throw new Error("Invalid item");
        }
        const storeItem = item;
        const oldValue = storeItem[key];
        (storeItem as any)[key] = value;
        this.emit("Set", storeItem, key, oldValue, value);
    }

    getValues<I extends StoreItem, K extends keyof I>(
        item: I,
        attr: K
    ): (I[K] | StoreItem)[] {
        if (!this.isItem(item)) {
            throw new Error("Invalid item");
        }
        const value = item[attr];
        if (
            this.isGroupOrRoot(item) &&
            attr === "children" &&
            Array.isArray(value)
        ) {
            return value.map((child) => this.items.get(child.id) as StoreItem);
        }
        return Array.isArray(value) ? value : [value];
    }

    fetchItemByIdentity(options: StoreFetchItemByIdentityOptions) {
        const item = this.items.get(options.identity) || null;
        if (item) {
            options.onItem(item);
        } else {
            options.onItem(null);
        }
    }

    getAttributes(item: StoreItem): (keyof StoreItemConfig)[] {
        if (!this.isItem(item)) {
            throw new Error("Invalid item");
        }
        return Object.keys(item) as (keyof StoreItemConfig)[];
    }

    isItem(val: unknown): val is StoreItem {
        if (typeof val !== "object" || val === null) return false;
        return (
            "__parentId" in val &&
            "id" in val &&
            typeof val.id === "number" &&
            this.items.has(val.id)
        );
    }

    dumpItem(item: StoreItem | null): StoreItemConfig {
        if (!item) {
            throw new Error("Item cannot be null");
        }

        const storeItem = item;
        const obj = { ...storeItem };

        if (this.isGroupOrRoot(storeItem)) {
            const children = this.getChildren(storeItem.id).map((child) =>
                this.dumpItem(child)
            ) as (StoreLayerConfig | StoreGroupConfig)[];
            (obj as StoreGroupConfig).children = children;
        }

        return obj as StoreItemConfig;
    }

    private getChildren(parentId: number): CustomStoreItem[] {
        return Array.from(this.items.values()).filter(
            (item) => item.__parentId === parentId
        );
    }
}
