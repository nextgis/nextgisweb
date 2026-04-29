import type { ResourceCls } from "@nextgisweb/resource/type/api";

export interface MetaFilterEntry {
  key: string;
  value: string;
}

export type SortField = "name" | "type" | "owner" | "updated";

export interface SearchSnapshot {
  q: string;
  keynameIn: string[];
  metaFilters: MetaFilterEntry[];
  clsIn: ResourceCls[];
  ownerUserIn: number[];
  root: number | null;
  order: string;
  limit: number;
  offset: number;
}

export const DEFAULT_LIMIT = 20;
