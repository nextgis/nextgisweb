import type { TreeChildrenItemConfig } from "@nextgisweb/webmap/type/TreeItems";
import type {
    GroupItemConfig,
    LayerItemConfig,
} from "@nextgisweb/webmap/type/api";

import type {
    TreeGroupStore,
    TreeItemStore,
    TreeLayerStore,
} from "./TreeItemStore";
import type { TreeStore } from "./TreeStore";

export type ConfigByType<T extends TreeChildrenItemConfig["type"]> =
    T extends "layer"
        ? LayerItemConfig
        : T extends "group"
          ? GroupItemConfig
          : TreeChildrenItemConfig;

export type NodeByType<T extends TreeChildrenItemConfig["type"]> =
    T extends "layer"
        ? TreeLayerStore
        : T extends "group"
          ? TreeGroupStore
          : never;

export function filterItems<T extends TreeChildrenItemConfig["type"]>(
    items: TreeItemStore[],
    query: { type: T } & Partial<ConfigByType<T>>
): NodeByType<T>[];

export function filterItems(
    items: TreeItemStore[],
    query: Partial<TreeChildrenItemConfig>
): TreeItemStore[];

export function filterItems(
    items: TreeItemStore[],
    query: Record<string, any>
) {
    const entries = Object.entries(query);
    const result: TreeItemStore[] = [];

    for (const it of items) {
        let match = true;
        for (const [k, v] of entries) {
            if ((it as any)[k] !== v) {
                match = false;
                break;
            }
        }
        if (match) result.push(it);
    }

    return result;
}

export function someItem<T extends TreeChildrenItemConfig["type"]>(
    items: TreeItemStore[],
    query: { type: T } & Partial<ConfigByType<T>>
): boolean {
    const entries = Object.entries(query);

    for (const node of items.values()) {
        for (const [k, v] of entries) {
            if (v === undefined) continue;
            if ((node as any)[k] === v) {
                return true;
            }
        }
    }

    return false;
}

function groupDepth(group: TreeGroupStore, store: TreeStore): number {
    let d = 0;
    let p = store.getParent(group.id);
    while (p) {
        d++;
        p = p.parentId !== null ? store.getParent(p.parentId) : null;
    }
    return d;
}

function* iterateDescendantLayerIds(
    nodeId: number,
    store: TreeStore
): Iterable<number> {
    const stack = [nodeId];
    while (stack.length) {
        const id = stack.pop()!;
        const n = store.getItemById(id);
        if (!n) continue;
        if (n.isGroup()) {
            for (let i = 0; i < n.childrenIds.length; i++)
                stack.push(n.childrenIds[i]);
        } else if (n.isLayer()) {
            yield n.id;
        }
    }
}

function anyDescendantInSet(
    nodeId: number,
    set: Set<number>,
    store: TreeStore
): boolean {
    for (const lid of iterateDescendantLayerIds(nodeId, store)) {
        if (set.has(lid)) return true;
    }
    return false;
}

function deleteAllDescendantLayerIds(
    nodeId: number,
    vis: Set<number>,
    store: TreeStore
): void {
    for (const lid of iterateDescendantLayerIds(nodeId, store)) {
        vis.delete(lid);
    }
}

export function validateVisible(
    store: TreeStore,
    currentVisibleIds: number[],
    prevVisibleIds: number[]
): number[] {
    const vis = new Set(currentVisibleIds);
    const prevSet = new Set(prevVisibleIds);
    const addedSet = new Set(
        currentVisibleIds.filter((id) => !prevVisibleIds.includes(id))
    );

    const groups: TreeGroupStore[] = [];
    for (const n of store.items.values())
        if (n.isGroup() && n.exclusive) groups.push(n);
    groups.sort((a, b) => groupDepth(b, store) - groupDepth(a, store));

    for (const g of groups) {
        const direct = [...g.childrenIds].reverse();

        const activeNow: number[] = [];
        const withNew: number[] = [];
        const hadBefore: Set<number> = new Set();

        for (const cid of direct) {
            const now = anyDescendantInSet(cid, vis, store);
            if (!now) continue;
            activeNow.push(cid);

            if (anyDescendantInSet(cid, addedSet, store)) withNew.push(cid);
            if (anyDescendantInSet(cid, prevSet, store)) hadBefore.add(cid);
        }

        if (activeNow.length <= 1) continue;

        let selectedCid: number;

        if (withNew.length >= 1) {
            selectedCid = withNew[0];
        } else {
            const prevKept = activeNow.find((cid) => hadBefore.has(cid));
            selectedCid = prevKept ?? activeNow[0];
        }

        for (const cid of activeNow) {
            if (cid === selectedCid) continue;
            deleteAllDescendantLayerIds(cid, vis, store);
        }
    }

    return Array.from(vis);
}
