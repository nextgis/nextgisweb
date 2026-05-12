import type { ResourceCls } from "@nextgisweb/resource/type/api";

export const SEARCH_PAGE_SIZE = 30;

export interface MetaFilterEntry {
  key: string;
  value: string;
}

export type SortField = "name" | "type" | "owner" | "created";

export interface SearchSnapshot {
  q: string;
  keynameIn: string[];
  metaFilters: MetaFilterEntry[];
  clsIn: ResourceCls[];
  ownerUserIn: number[];
  root: number | null;
  order: string;
}
