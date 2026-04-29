import type { QueryParams } from "@nextgisweb/pyramid/api/request";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import { DEFAULT_LIMIT } from "./types";
import type { MetaFilterEntry, SearchSnapshot } from "./types";

/** Build API query parameters from the current store state. */
export function paramsFromStore(s: SearchSnapshot): QueryParams {
  const query: QueryParams = {
    breadcrumb: true,
    total_count: true,
    limit: s.limit,
    offset: s.offset,
  };

  const q = s.q.trim();
  if (q) {
    query.display_name__ilike = `%${q}%`;
  }

  if (s.clsIn.length > 0) {
    query.cls__in = [...s.clsIn];
  }
  if (s.ownerUserIn.length > 0) {
    query.owner_user__in = [...s.ownerUserIn];
  }
  if (s.keynameIn.length > 0) {
    query.keyname__in = [...s.keynameIn];
  }

  if (s.root !== null) {
    query.root = s.root;
  }

  if (s.order) {
    query.order = s.order;
  }

  const has: Record<string, boolean> = {};
  const ilike: Record<string, string> = {};
  for (const { key, value } of s.metaFilters) {
    const k = key.trim();
    const v = value.trim();
    if (k) has[k] = true;
    if (v) {
      // When key is empty, we still need a key for the dict — skip such entries.
      if (k) ilike[k] = `%${v}%`;
    }
  }
  if (Object.keys(has).length > 0) {
    query.resmeta__has = has;
  }
  if (Object.keys(ilike).length > 0) {
    query.resmeta__ilike = ilike;
  }

  return query;
}

/** Serialize the store state into a URL search string (without leading '?'). */
export function urlFromStore(s: SearchSnapshot): string {
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.clsIn.length > 0) sp.set("cls", s.clsIn.join(","));
  if (s.ownerUserIn.length > 0) sp.set("owner", s.ownerUserIn.join(","));
  if (s.keynameIn.length > 0) sp.set("keyname", s.keynameIn.join(","));
  if (s.root !== null) sp.set("root", String(s.root));
  if (s.order) sp.set("order", s.order);
  if (s.limit !== DEFAULT_LIMIT) sp.set("limit", String(s.limit));
  if (s.offset !== 0) sp.set("offset", String(s.offset));
  s.metaFilters.forEach((entry, i) => {
    if (entry.key) sp.set(`meta_key_${i}`, entry.key);
    if (entry.value) sp.set(`meta_value_${i}`, entry.value);
  });
  return sp.toString();
}

/** Build a partial snapshot from a URL search string. */
export function snapshotFromUrl(search: string): Partial<SearchSnapshot> {
  const sp = new URLSearchParams(search);
  const result: Partial<SearchSnapshot> = {};

  const q = sp.get("q");
  if (q !== null) result.q = q;

  const cls = sp.get("cls");
  if (cls) result.clsIn = cls.split(",").filter(Boolean) as ResourceCls[];

  const owner = sp.get("owner");
  if (owner) {
    const ids = owner
      .split(",")
      .map((v) => parseInt(v, 10))
      .filter((v) => Number.isFinite(v));
    if (ids.length > 0) result.ownerUserIn = ids;
  }

  const keyname = sp.get("keyname");
  if (keyname) result.keynameIn = keyname.split(",").filter(Boolean);

  const root = sp.get("root");
  if (root !== null) {
    const n = parseInt(root, 10);
    if (Number.isFinite(n)) result.root = n;
  }

  const order = sp.get("order");
  if (order !== null) result.order = order;

  const limit = sp.get("limit");
  if (limit !== null) {
    const n = parseInt(limit, 10);
    if (Number.isFinite(n) && n >= 1) result.limit = n;
  }

  const offset = sp.get("offset");
  if (offset !== null) {
    const n = parseInt(offset, 10);
    if (Number.isFinite(n) && n >= 0) result.offset = n;
  }

  // Collect indexed meta filter entries.
  const metaIndices = new Set<number>();
  for (const k of sp.keys()) {
    const m = /^meta_(?:key|value)_(\d+)$/.exec(k);
    if (m) metaIndices.add(parseInt(m[1], 10));
  }
  if (metaIndices.size > 0) {
    const sorted = [...metaIndices].sort((a, b) => a - b);
    const entries: MetaFilterEntry[] = sorted.map((i) => ({
      key: sp.get(`meta_key_${i}`) ?? "",
      value: sp.get(`meta_value_${i}`) ?? "",
    }));
    result.metaFilters = entries;
  }

  return result;
}

export function hasAnyFilter(s: SearchSnapshot): boolean {
  return (
    s.q.trim() !== "" ||
    s.clsIn.length > 0 ||
    s.ownerUserIn.length > 0 ||
    s.keynameIn.length > 0 ||
    s.root !== null ||
    s.metaFilters.some((e) => e.key.trim() || e.value.trim())
  );
}
