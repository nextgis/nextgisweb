import { action, observable, runInAction } from "mobx";

import type { UserReadBrief } from "@nextgisweb/auth/type/api";
import { extractError } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import type { CompositeRead, ResourceCls } from "@nextgisweb/resource/type/api";

import {
  hasAnyFilter,
  paramsFromStore,
  snapshotFromUrl,
  urlFromStore,
} from "./serialize";
import { DEFAULT_LIMIT } from "./types";
import type { MetaFilterEntry, SearchSnapshot } from "./types";

interface BreadcrumbNode {
  id: number;
  display_name: string;
}

export class ResourceSearchStore {
  @observable.ref accessor q: string = "";
  @observable.shallow accessor keynameIn: string[] = [];
  @observable.shallow accessor metaFilters: MetaFilterEntry[] = [];

  @observable.shallow accessor clsIn: ResourceCls[] = [];
  @observable.shallow accessor ownerUserIn: number[] = [];
  @observable.ref accessor root: number | null = null;

  @observable.ref accessor order: string = "";
  @observable.ref accessor limit: number = DEFAULT_LIMIT;
  @observable.ref accessor offset: number = 0;

  @observable.shallow accessor results: CompositeRead[] = [];
  @observable.shallow accessor breadcrumbs: Record<number, BreadcrumbNode[]> =
    {};
  @observable.ref accessor totalCount: number = 0;
  @observable.ref accessor loading: boolean = false;
  @observable.ref accessor error: string | null = null;

  @observable.ref accessor settingsVisible: boolean = false;

  @observable.shallow accessor usersById: Map<number, UserReadBrief> =
    new Map();

  private abortController: AbortController | null = null;
  private usersPromise: Promise<UserReadBrief[]> | null = null;

  constructor() {
    this.hydrateFromUrl(window.location.search);
    if (hasAnyFilter(this.snapshot())) {
      void this.applyFilters({ pushHistory: false, resetOffset: false });
    }
  }

  loadUsers(signal?: AbortSignal): Promise<UserReadBrief[]> {
    if (this.usersPromise) return this.usersPromise;
    this.usersPromise = (async () => {
      const data = (await route("auth.user.collection").get({
        query: { brief: true },
        signal,
      })) as UserReadBrief[];
      const filtered = data.filter((u) => !u.system);
      runInAction(() => {
        this.usersById = new Map(filtered.map((u) => [u.id, u]));
      });
      return filtered;
    })().catch((err) => {
      this.usersPromise = null;
      throw err;
    });
    return this.usersPromise;
  }

  snapshot(): SearchSnapshot {
    return {
      q: this.q,
      keynameIn: this.keynameIn,
      metaFilters: this.metaFilters,
      clsIn: this.clsIn,
      ownerUserIn: this.ownerUserIn,
      root: this.root,
      order: this.order,
      limit: this.limit,
      offset: this.offset,
    };
  }

  @action
  hydrateFromUrl(search: string): void {
    const snap = snapshotFromUrl(search);
    if (snap.q !== undefined) this.q = snap.q;
    if (snap.keynameIn !== undefined) this.keynameIn = snap.keynameIn;
    if (snap.metaFilters !== undefined) this.metaFilters = snap.metaFilters;
    if (snap.clsIn !== undefined) this.clsIn = snap.clsIn;
    if (snap.ownerUserIn !== undefined) this.ownerUserIn = snap.ownerUserIn;
    if (snap.root !== undefined) this.root = snap.root;
    if (snap.order !== undefined) this.order = snap.order;
    if (snap.limit !== undefined) this.limit = snap.limit;
    if (snap.offset !== undefined) this.offset = snap.offset;
    if (
      (snap.metaFilters && snap.metaFilters.length > 0) ||
      (snap.keynameIn && snap.keynameIn.length > 0)
    ) {
      this.settingsVisible = true;
    }
  }

  syncUrl({ replace = false }: { replace?: boolean } = {}): void {
    const qs = urlFromStore(this.snapshot());
    const url =
      window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
    if (replace) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
  }

  @action.bound
  async applyFilters({
    pushHistory = true,
    resetOffset = true,
  }: { pushHistory?: boolean; resetOffset?: boolean } = {}): Promise<void> {
    if (resetOffset) {
      this.offset = 0;
    }

    this.abortController?.abort();
    const ac = new AbortController();
    this.abortController = ac;

    this.loading = true;
    this.error = null;

    const query = paramsFromStore(this.snapshot());

    try {
      const resp = await route("resource.search").get({
        query: query as unknown as Parameters<
          ReturnType<typeof route<"resource.search">>["get"]
        >[0]["query"],
        signal: ac.signal,
      });

      const data = resp as {
        items: CompositeRead[];
        total_count: number;
        breadcrumb?: Record<string, BreadcrumbNode[]>;
        order: string[];
      };

      const breadcrumbs: Record<number, BreadcrumbNode[]> = {};
      if (data.breadcrumb) {
        for (const [k, v] of Object.entries(data.breadcrumb)) {
          breadcrumbs[Number(k)] = v;
        }
      }

      runInAction(() => {
        this.results = data.items;
        this.totalCount = data.total_count;
        this.breadcrumbs = breadcrumbs;
        this.loading = false;
      });

      if (pushHistory) {
        this.syncUrl({ replace: false });
      } else {
        this.syncUrl({ replace: true });
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      const info = extractError(err);
      runInAction(() => {
        this.error = info.title || info.message || String(err);
        this.loading = false;
      });
    }
  }

  @action.bound setSearchText(value: string) {
    this.q = value;
  }

  @action.bound setKeynames(values: string[]) {
    this.keynameIn = values;
  }

  @action.bound setMetaFilters(entries: MetaFilterEntry[]) {
    this.metaFilters = entries;
  }

  @action.bound addMetaFilter() {
    this.metaFilters = [...this.metaFilters, { key: "", value: "" }];
  }

  @action.bound removeMetaFilter(index: number) {
    this.metaFilters = this.metaFilters.filter((_, i) => i !== index);
  }

  @action.bound updateMetaFilter(
    index: number,
    patch: Partial<MetaFilterEntry>
  ) {
    this.metaFilters = this.metaFilters.map((e, i) =>
      i === index ? { ...e, ...patch } : e
    );
  }

  @action.bound setTypes(values: ResourceCls[]) {
    this.clsIn = values;
  }

  @action.bound setOwners(values: number[]) {
    this.ownerUserIn = values;
  }

  @action.bound setRoot(value: number | null) {
    this.root = value;
  }

  @action.bound setOrder(value: string) {
    this.order = value;
  }

  @action.bound setPage(offset: number, limit?: number) {
    this.offset = offset;
    if (limit !== undefined) this.limit = limit;
  }

  @action.bound toggleSettings() {
    this.settingsVisible = !this.settingsVisible;
  }

  @action.bound onTablePageOrSortChange(
    offset: number,
    limit: number,
    order: string
  ): void {
    this.offset = offset;
    this.limit = limit;
    this.order = order;
    void this.applyFilters({ pushHistory: false, resetOffset: false });
  }

  duplicateMetaKeys(): Set<string> {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const { key } of this.metaFilters) {
      const k = key.trim();
      if (!k) continue;
      if (seen.has(k)) dupes.add(k);
      else seen.add(k);
    }
    return dupes;
  }

  hasMetaErrors(): boolean {
    return this.duplicateMetaKeys().size > 0;
  }

  destroy = () => {
    this.abortController?.abort();
    this.abortController = null;
  };
}
