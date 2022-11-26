export function createCacheKey({
    visibleFields,
    pageSize,
    orderBy,
    query,
    page,
}) {
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
