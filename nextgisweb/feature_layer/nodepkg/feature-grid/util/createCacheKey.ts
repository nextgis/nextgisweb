import type { OrderBy } from "../type";

interface CreateCacheKeyOptions {
    visibleFields: number[];
    pageSize: number;
    orderBy?: OrderBy;
    query: string;
    page: number;
}

export function createCacheKey({
    visibleFields,
    pageSize,
    orderBy,
    query,
    page,
}: CreateCacheKeyOptions): string {
    return [
        "pageSize",
        pageSize,
        "query",
        query,
        "page",
        page,
        "visibleFields",
        visibleFields.sort().join("_"),
        "orderBy",
        orderBy ? orderBy.join("_") : "",
    ].join("__");
}
