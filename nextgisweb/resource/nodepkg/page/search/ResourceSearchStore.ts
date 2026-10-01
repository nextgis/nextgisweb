import {
  action,
  actionBound,
  observableRef,
  observableShallow,
  runInAction,
} from "mobx";

import type { UserReadBrief } from "@nextgisweb/auth/type/api";
import { extractError, isAbortError } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import type { CompositeRead, ResourceCls } from "@nextgisweb/resource/type/api";

import { paramsFromStore, snapshotFromUrl, urlFromStore } from "./serialize";
import { SEARCH_PAGE_SIZE } from "./types";
import type { MetaFilterEntry, SearchSnapshot } from "./types";

interface BreadcrumbNode {
  id: number;
  display_name: string;
}

export class ResourceSearchStore {
  @observableRef accessor q: string = "";
  @observableShallow accessor keynameIn: string[] = [];
  @observableShallow accessor metaFilters: MetaFilterEntry[] = [];

  @observableShallow accessor clsIn: ResourceCls[] = [];
  @observableShallow accessor ownerUserIn: number[] = [];
  @observableRef accessor root: number | null = null;

  @observableRef accessor order: string = "";

  @observableShallow accessor results: CompositeRead[] = [];
  @observableShallow accessor breadcrumbs: Record<number, BreadcrumbNode[]> =
    {};
  @observableRef accessor totalCount: number = 0;
  @observableRef accessor loading: boolean = false;
  @observableRef accessor loadingMore: boolean = false;
  @observableRef accessor error: string | null = null;

  @observableRef accessor settingsVisible: boolean = false;

  @observableShallow accessor usersById: Map<number, UserReadBrief> = new Map();

  private abortController: AbortController | null = null;
  private usersPromise: Promise<UserReadBrief[]> | null = null;

  constructor() {
    this.hydrateFromUrl(window.location.search);
  }

  init() {
    void this.applyFilters({ pushHistory: false });
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
      if (isAbortError(err)) {
        this.usersPromise = null;
      } else {
        this.usersPromise = null;
        console.error("Failed to load users:", err);
      }
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

  private mergeBreadcrumbs(
    current: Record<number, BreadcrumbNode[]>,
    incoming?: Record<string, BreadcrumbNode[]>
  ): Record<number, BreadcrumbNode[]> {
    if (!incoming) return current;

    const next = { ...current };
    for (const [k, v] of Object.entries(incoming)) {
      next[Number(k)] = v;
    }
    return next;
  }

  private async fetchPage({
    offset,
    append,
    pushHistory,
  }: {
    offset: number;
    append: boolean;
    pushHistory?: boolean;
  }): Promise<void> {
    if (append ? this.loadingMore : this.loading) {
      return;
    }

    if (!append) {
      this.abortController?.abort();
      this.error = null;
      this.loading = true;
    } else {
      this.loadingMore = true;
    }

    const ac = new AbortController();
    this.abortController = ac;

    const query = paramsFromStore(this.snapshot());
    query.limit = SEARCH_PAGE_SIZE;
    query.offset = offset;

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

      runInAction(() => {
        this.results = append ? [...this.results, ...data.items] : data.items;
        this.totalCount = data.total_count;
        this.breadcrumbs = this.mergeBreadcrumbs(
          append ? this.breadcrumbs : {},
          data.breadcrumb
        );
        this.loading = false;
        this.loadingMore = false;
      });

      if (!append) {
        if (pushHistory) {
          this.syncUrl({ replace: false });
        } else {
          this.syncUrl({ replace: true });
        }
      }
    } catch (err) {
      if (ac.signal.aborted || isAbortError(err)) {
        if (this.abortController === ac) {
          runInAction(() => {
            this.loading = false;
            this.loadingMore = false;
          });
        }
        return;
      }

      const info = extractError(err);
      console.error(
        append ? "Search page load failed:" : "Search failed:",
        info
      );
      runInAction(() => {
        this.error = info.title || info.message || String(err);
        this.loading = false;
        this.loadingMore = false;
      });
    }
  }

  @actionBound
  async applyFilters({
    pushHistory = true,
  }: { pushHistory?: boolean } = {}): Promise<void> {
    await this.fetchPage({ offset: 0, append: false, pushHistory });
  }

  @actionBound
  async loadMore(): Promise<void> {
    if (
      this.loading ||
      this.loadingMore ||
      this.results.length >= this.totalCount ||
      this.totalCount === 0
    ) {
      return;
    }

    await this.fetchPage({ offset: this.results.length, append: true });
  }

  @actionBound setSearchText(value: string) {
    this.q = value;
  }

  @actionBound setKeynames(values: string[]) {
    this.keynameIn = values;
  }

  @actionBound setMetaFilters(entries: MetaFilterEntry[]) {
    this.metaFilters = entries;
  }

  @actionBound addMetaFilter() {
    this.metaFilters = [...this.metaFilters, { key: "", value: "" }];
  }

  @actionBound removeMetaFilter(index: number) {
    this.metaFilters = this.metaFilters.filter((_, i) => i !== index);
  }

  @actionBound updateMetaFilter(
    index: number,
    patch: Partial<MetaFilterEntry>
  ) {
    this.metaFilters = this.metaFilters.map((e, i) =>
      i === index ? { ...e, ...patch } : e
    );
  }

  @actionBound setTypes(values: ResourceCls[]) {
    this.clsIn = values;
  }

  @actionBound setOwners(values: number[]) {
    this.ownerUserIn = values;
  }

  @actionBound setRoot(value: number | null) {
    this.root = value;
  }

  @actionBound setOrder(value: string) {
    this.order = value;
  }

  @actionBound toggleSettings() {
    this.settingsVisible = !this.settingsVisible;
  }

  @actionBound onTableSortChange(order: string): void {
    this.order = order;
    void this.applyFilters({ pushHistory: false });
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

  @actionBound
  destroy() {
    this.abortController?.abort();
    this.abortController = null;
    this.loading = false;
    this.loadingMore = false;
  }
}
