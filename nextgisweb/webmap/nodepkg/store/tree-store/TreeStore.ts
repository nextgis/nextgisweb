import { action, computed, observable, reaction, runInAction } from "mobx";

import { route } from "@nextgisweb/pyramid/api";
import type { LegendSymbol } from "@nextgisweb/render/type/api";
import type { TreeChildrenItemConfig } from "@nextgisweb/webmap/type/TreeItems";
import type {
    GroupItemConfig,
    LayerItemConfig,
    LegendInfo,
    RootItemConfig,
} from "@nextgisweb/webmap/type/api";

import { createTreeItemStore } from "./TreeItemStore";
import type {
    TreeGroupStore,
    TreeItemStore,
    TreeLayerStore,
} from "./TreeItemStore";
import { filterItems, someItem, validateVisible } from "./treeStoreUtil";
import type { ConfigByType, NodeByType } from "./treeStoreUtil";

interface TreeStoreOptions {
    drawOrderEnabled?: boolean;
}
export class TreeStore {
    rootId: number;

    @observable.shallow accessor items = new Map<number, TreeItemStore>();
    @observable.shallow accessor childrenIds: number[] = [];
    @observable.ref accessor visibleLayerIds: number[] = [];

    @observable.ref accessor drawOrderEnabled = false;

    private readonly _loadingResourceSymbols = new Set<number>();

    constructor(rootItem: RootItemConfig, options?: TreeStoreOptions) {
        this.rootId = rootItem.id;
        this.drawOrderEnabled = options?.drawOrderEnabled ?? false;
        this.load(rootItem);
        reaction(
            () => this.treeStructureStamp,

            () => {
                this.recomputeDrawOrderPositions();
            }
        );

        reaction(
            () => {
                void this.hasExclusiveGroup;
                void this.treeStructureStamp;
                const ids: number[] = [];
                for (const it of this.items.values()) {
                    if (it.isLayer() && it.visibility) ids.push(it.id);
                }
                return ids;
            },
            (curVisibleIds, prevVisibleIds = []) => {
                if (this.hasExclusiveGroup) {
                    const validVisibleIds = validateVisible(
                        this,
                        curVisibleIds,
                        prevVisibleIds
                    );

                    const same =
                        validVisibleIds.length === curVisibleIds.length &&
                        validVisibleIds.every((v, i) => v === curVisibleIds[i]);

                    if (!same) {
                        runInAction(() => {
                            const keep = new Set(validVisibleIds);
                            for (const n of this.items.values()) {
                                if (!n.isLayer()) continue;
                                const shouldBe = keep.has(n.id);
                                if (n.visibility !== shouldBe)
                                    n.update({ visibility: shouldBe });
                            }

                            this.visibleLayerIds = validVisibleIds;
                        });
                    }
                }
                runInAction(() => {
                    this.visibleLayerIds = curVisibleIds;
                });
            },
            { fireImmediately: true }
        );
    }

    @action.bound
    load(rootItem: RootItemConfig) {
        this.rootId = rootItem.id;
        const children = rootItem.children;
        this.items.clear();

        this.childrenIds = [];
        this.visibleLayerIds = [];
        [...children].reverse().forEach((child) => {
            this.addItem(child);
        });

        if (this.drawOrderEnabled) {
            const layers: TreeLayerStore[] = [];
            for (const item of this.items.values()) {
                if (item.isLayer()) {
                    layers.push(item);
                }
            }
            if (layers.length) {
                const sorted = [...layers].sort(
                    (a, b) => a.drawOrderPosition - b.drawOrderPosition
                );
                const lastIndex = sorted.length - 1;
                sorted.forEach((layer, idx) => {
                    const newPos = lastIndex - idx + 1;
                    layer.update({ drawOrderPosition: newPos });
                });
            }
        }
    }

    nextId() {
        const ids = [...this.items.keys()];
        return ids.length ? Math.max(...ids) + 1 : 1;
    }

    @action.bound
    runInAction(fn: () => void) {
        fn();
    }

    private dumpChildren(childrenIds: number[]) {
        const result: (GroupItemConfig | LayerItemConfig)[] = [];
        // Reverse back
        for (let i = childrenIds.length - 1; i >= 0; i--) {
            const cid = childrenIds[i];
            const child = this.items.get(cid);
            if (!child) continue;
            result.push(this.dumpNode(child));
        }
        return result;
    }

    private dumpNode(node: TreeItemStore): GroupItemConfig | LayerItemConfig {
        if (node.isGroup()) {
            const base = node.dump();
            return {
                ...base,
                children: this.dumpChildren(node.childrenIds),
            };
        }
        return node.dump();
    }

    dump(): RootItemConfig {
        return {
            type: "root",
            id: this.rootId,
            key: this.rootId,
            label: "",
            title: "",
            children: this.dumpChildren(this.childrenIds),
        } satisfies RootItemConfig;
    }

    // Use only for trigger tree structure change event
    @computed.struct
    get treeStructureStamp(): number[] {
        const result: number[] = [];
        const stack: number[] = [...this.childrenIds].reverse();

        while (stack.length) {
            const id = stack.pop()!;
            result.push(id);

            const node = this.items.get(id);
            if (node?.isGroup() && node.childrenIds.length) {
                stack.push(...[...node.childrenIds].reverse());
            }
        }
        return result;
    }

    @computed.struct
    get visibleLayers(): TreeLayerStore[] {
        return this.visibleLayerIds.map((id) =>
            this.items.get(id)
        ) as TreeLayerStore[];
    }
    @computed
    get hasExclusiveGroup(): boolean {
        for (const n of this.items.values()) {
            if (n.isGroup() && n.exclusive) {
                return true;
            }
        }
        return false;
    }

    @computed.struct
    get editableLayers(): TreeLayerStore[] {
        const res: TreeLayerStore[] = [];
        for (const n of this.items.values()) {
            if (n.isLayer() && n.editable) {
                res.push(n);
            }
        }
        return res;
    }

    @computed.struct
    get expanded(): number[] {
        const res: number[] = [];
        for (const n of this.items.values()) {
            if (n.isGroup() && n.expanded) {
                res.push(n.id);
            }
        }
        return res;
    }

    @computed.struct
    get layersInExpandedGroupIds(): number[] {
        const result: number[] = [];
        const stack: number[] = [...this.childrenIds].reverse();

        while (stack.length) {
            const id = stack.pop()!;
            const node = this.items.get(id);
            if (!node) continue;

            if (node.isGroup()) {
                if (!node.expanded) continue;
                const kids = node.childrenIds;
                if (kids?.length) {
                    stack.push(...[...kids].reverse());
                }
                continue;
            }

            if (node.isLayer()) {
                result.push(node.id);
            }
        }

        return result;
    }

    @computed.struct
    get layersWithoutLegendInfo(): TreeLayerStore[] {
        const res: TreeLayerStore[] = [];

        for (let i = 0; i < this.layersInExpandedGroupIds.length; i++) {
            const item = this.items.get(this.layersInExpandedGroupIds[i]);
            if (item && item.isLayer() && this.shouldHaveLegendInfo(item)) {
                res.push(item);
            }
        }
        return res;
    }

    getStoreItem(identity: number) {
        return this.items.get(identity);
    }

    getItemById(id: number) {
        return this.items.get(id) ?? null;
    }

    getParent(itemId: number): TreeGroupStore | null {
        const parentId = this.getItemById(itemId)?.parentId;
        if (parentId !== null && parentId !== undefined) {
            return this.getItemById(parentId) as TreeGroupStore | null;
        }
        return null;
    }

    getChildren(parent: number | { childrenIds: number[] }): TreeItemStore[] {
        let childrenIds: number[] | undefined;

        if (typeof parent === "number") {
            const p = this.items.get(parent);
            if (!p || !p.isGroup()) return [];
            childrenIds = p.childrenIds;
        } else {
            childrenIds = parent?.childrenIds;
            if (!childrenIds) return [];
        }

        const res: TreeItemStore[] = [];
        for (let i = 0; i < childrenIds.length; i++) {
            const n = this.items.get(childrenIds[i]);
            if (n) res.push(n);
        }
        return res;
    }

    getDescendants(parentId: number): TreeItemStore[] {
        const res: TreeItemStore[] = [];
        const q = this.getChildren(parentId);

        for (let i = 0; i < q.length; i++) {
            const n = q[i];
            res.push(n);

            const ch = this.getChildren(n.id);
            if (ch.length) {
                const len = q.length;
                q.length = len + ch.length;
                for (let j = 0; j < ch.length; j++) {
                    q[len + j] = ch[j];
                }
            }
        }

        return res;
    }

    filter<T extends TreeChildrenItemConfig["type"]>(
        query: { type: T } & Partial<ConfigByType<T>>
    ): NodeByType<T>[];
    filter(query: Partial<TreeChildrenItemConfig>): TreeItemStore[] {
        return filterItems(Array.from(this.items.values()), query);
    }

    some<T extends TreeChildrenItemConfig["type"]>(
        query: { type: T } & Partial<ConfigByType<T>>
    ): boolean {
        return someItem(Array.from(this.items.values()), query);
    }

    @action.bound
    addItem(
        cfg: TreeChildrenItemConfig,
        parentId: number | null = null
    ): TreeItemStore {
        const { id, type } = cfg;
        const node = createTreeItemStore(cfg, parentId);
        this.items.set(id, node);

        this.insert(id, parentId);

        if (type === "group") {
            [...cfg.children].reverse().forEach((c) => this.addItem(c, id));
        }

        return node;
    }

    @action.bound
    insertItem(store: TreeLayerStore, index?: number): TreeLayerStore {
        const id = store.id;

        const exist = this.items.get(id);
        if (exist) {
            throw new Error(`Tree item with ID:${id} already exist`);
        }

        const targetParentId = store.parentId;
        this.items.set(id, store);

        this.insert(id, targetParentId, index);

        return store;
    }

    @action.bound
    setValue<T extends TreeItemStore, K extends keyof T>(
        item: T,
        key: K,
        value: T[K]
    ): void {
        const oldValue = item[key];
        if (oldValue === value) return;
        item[key] = value;
    }

    private insert(itemId: number, newParentId: number | null, index?: number) {
        const insert = (arr: number[]) => {
            if (index === undefined || index < 0 || index > arr.length) {
                arr.push(itemId);
            } else {
                arr.splice(index, 0, itemId);
            }
            return [...arr];
        };

        if (newParentId !== null) {
            const np = this.items.get(newParentId);
            if (np && np.isGroup()) {
                np.setChildrenIds(insert(np.childrenIds));
            }
        } else {
            this.childrenIds = insert(this.childrenIds);
        }
    }

    private remove(itemId: number, oldParentId: number | null) {
        const remove = (arr: number[]) => {
            const i = arr.indexOf(itemId);
            if (i >= 0) arr.splice(i, 1);
            return [...arr];
        };

        if (oldParentId !== null) {
            const op = this.items.get(oldParentId);
            if (op && op.isGroup()) {
                op.setChildrenIds(remove(op.childrenIds));
            }
        } else {
            this.childrenIds = remove(this.childrenIds);
        }
    }

    @action.bound
    move(itemId: number, newParentId: number | null, index?: number) {
        const node = this.items.get(itemId);
        if (!node) return;

        this.remove(itemId, node.parentId);

        node.parentId = newParentId;

        this.insert(itemId, newParentId, index);
    }

    @action.bound
    deleteItem(itemId: number) {
        const stack = [itemId];

        while (stack.length) {
            const cur = stack.pop()!;
            const node = this.items.get(cur);
            if (!node) continue;

            if (node.isGroup() && node.childrenIds.length) {
                stack.push(...node.childrenIds);
            }

            this.remove(cur, node.parentId);

            this.items.delete(cur);
        }
    }

    @action.bound
    setVisibleIds(val: number[]) {
        let validVisibleIds = val;
        if (this.hasExclusiveGroup) {
            validVisibleIds = validateVisible(this, val, this.visibleLayerIds);
        }
        for (const item of this.items.values()) {
            if (item.isLayer()) {
                item.update({
                    visibility: validVisibleIds.includes(item.id),
                });
            }
        }
    }

    @action.bound
    setExpanded(expanded: number[]) {
        Array.from(this.items.values()).forEach((item) => {
            if (item.isGroup()) {
                item.update({ expanded: expanded.includes(item.id) });
            }
        });
    }

    shouldHaveLegendInfo = (item: TreeLayerStore) => {
        return (
            !this._loadingResourceSymbols.has(item.styleId) &&
            item.legendInfo.has_legend &&
            (item.legendInfo.symbols === null ||
                item.legendInfo.symbols === undefined)
        );
    };

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
            } catch (err) {
                console.error(
                    "Error fetching render.resource_legend_symbols:",
                    err
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
        this.items.forEach((item) => {
            if (
                item.isLayer() &&
                item.styleId === styleId &&
                item.legendInfo.has_legend &&
                !item.legendInfo.symbols
            ) {
                const single = !!symbols && symbols.length === 1;
                const legendInfo: LegendInfo = {
                    ...item.legendInfo,
                    symbols: symbols ?? [],
                    single,
                };
                if (!single) {
                    legendInfo.open = legendInfo.visible === "expand";
                }
                item.update({ legendInfo });

                return true;
            }
            return false;
        });
    }

    private _collectLayersInTreeOrder(
        parent: number | { childrenIds: number[] },
        acc: TreeLayerStore[]
    ) {
        for (const child of this.getChildren(parent)) {
            if (child.isGroup()) {
                this._collectLayersInTreeOrder(child.id, acc);
            } else if (child.isLayer()) {
                acc.push(child);
            }
        }
    }

    @action.bound
    recomputeDrawOrderPositions() {
        const layers: TreeLayerStore[] = [];

        this._collectLayersInTreeOrder(this, layers);

        layers.forEach((layer, idx) => {
            layer.update({ drawOrderPosition: idx });
        });
    }
}
