import type { OrderBy } from "../type";

interface CreateCacheKeyOptions {
    visibleFields: number[];
    pageSize: number;
    orderBy?: OrderBy;
    version?: number;
    query: string;
    queryIntersects?: string;
    page: number;
}

export function createCacheKey({
    visibleFields,
    pageSize,
    orderBy,
    version,
    query,
    queryIntersects,
    page,
}: CreateCacheKeyOptions): string {
    return [
        "pageSize",
        pageSize,
        "query",
        query,
        "queryIntersects",
        queryIntersects || "",
        "page",
        page,
        "version",
        version,
        "visibleFields",
        visibleFields.sort().join("_"),
        "orderBy",
        orderBy ? orderBy.join("_") : "",
    ].join("__");
}
