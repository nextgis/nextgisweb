import type { SearchResult, SearchResultGroup } from "../type";

export function toResultGroup(
  type: "place" | "public",
  label: string,
  children: SearchResult[]
): SearchResultGroup[] {
  return children.length ? [{ type, label, children }] : [];
}
