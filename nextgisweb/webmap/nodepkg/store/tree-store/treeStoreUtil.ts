import type { TreeChildrenItemStore } from "@nextgisweb/webmap/type/TreeItems";

import type {
  TreeGroupStore,
  TreeItemStore,
  TreeLayerStore,
} from "./TreeItemStore";
import type { TreeStore } from "./TreeStore";

export type ConfigByType<T extends TreeChildrenItemStore["type"]> =
  T extends "layer"
    ? TreeLayerStore
    : T extends "group"
      ? TreeGroupStore
      : TreeChildrenItemStore;

export type NodeByType<T extends TreeChildrenItemStore["type"]> =
  T extends "layer"
    ? TreeLayerStore
    : T extends "group"
      ? TreeGroupStore
      : never;

export interface SetItemVisibilityOptions {
  cascade?: "descendants" | "ancestors";
}

export function filterItems<T extends TreeChildrenItemStore["type"]>(
  items: TreeItemStore[],
  query: { type: T } & Partial<ConfigByType<T>>
): NodeByType<T>[];

export function filterItems(
  items: TreeItemStore[],
  query: Partial<TreeChildrenItemStore>
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

export function someItem<T extends TreeChildrenItemStore["type"]>(
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

export function setParentsVisibility(
  store: TreeStore,
  itemIds: Iterable<number>,
  visibility: boolean
) {
  for (const itemId of itemIds) {
    let parent = store.getParent(itemId);
    while (parent) {
      parent.update({ visibility });
      parent = store.getParent(parent.id);
    }
  }
}

export function updateItemVisibility(
  store: TreeStore,
  itemId: number,
  visibility: boolean,
  options?: SetItemVisibilityOptions
) {
  const item = store.getItemById(itemId);
  if (!item) return;

  item.update({ visibility });

  if (options?.cascade === "descendants" && item.isGroup()) {
    for (const child of store.getDescendants(itemId)) {
      child.update({ visibility });
    }
  } else if (options?.cascade === "ancestors") {
    setParentsVisibility(store, [itemId], visibility);
  } else if (visibility && item.isLayer()) {
    setParentsVisibility(store, [itemId], true);
  }
}

function groupDepth(group: TreeGroupStore, store: TreeStore): number {
  let d = 0;
  let p = store.getParent(group.id);
  while (p) {
    d++;
    p = store.getParent(p.id);
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

export function validateVisible(
  store: TreeStore,
  currentVisibleIds: number[],
  previousVisibleIds: number[]
): number[] {
  const vis = new Set(currentVisibleIds);
  const previousIds = new Set(previousVisibleIds);
  const addedSet = new Set(
    currentVisibleIds.filter((id) => !previousIds.has(id))
  );

  const groups: TreeGroupStore[] = [];
  for (const n of store.items.values())
    if (n.isGroup() && n.exclusive) groups.push(n);
  groups.sort((a, b) => groupDepth(b, store) - groupDepth(a, store));

  for (const g of groups) {
    const direct = [...g.childrenIds].reverse();

    const activeNow: number[] = [];
    const withNew: number[] = [];

    for (const cid of direct) {
      if (!vis.has(cid)) continue;
      activeNow.push(cid);

      if (addedSet.has(cid)) withNew.push(cid);
    }

    if (activeNow.length <= 1) continue;

    let selectedCid: number;

    if (withNew.length === 1) {
      selectedCid = withNew[0];
    } else if (withNew.length > 1) {
      selectedCid =
        withNew.find((cid) => anyDescendantInSet(cid, vis, store)) ??
        withNew[0];
    } else {
      const prevKept = activeNow.find((cid) => previousIds.has(cid));
      selectedCid = prevKept ?? activeNow[0];
    }

    for (const cid of activeNow) {
      if (cid === selectedCid) continue;
      vis.delete(cid);
    }
  }

  return Array.from(vis);
}
