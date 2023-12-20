import type { QueryParams } from "../hook/useFeatureTable";
import type { OrderBy } from "../type";

interface CreateCacheKeyOptions extends QueryParams {
    visibleFields: number[];
    pageSize: number;
    orderBy?: OrderBy;
    version?: number;
    page: number;
}

export function createCacheKey({
    visibleFields,
    orderBy,
    ...restParams
}: CreateCacheKeyOptions): string {
    const key: string[] = [
        "visibleFields",
        [...visibleFields].sort().join("_"),
        "orderBy",
        orderBy ? orderBy.join("_") : "",
        ...Object.entries(restParams)
            .filter((val) => !!val[1])
            .map(([key, val]) => [key, String(val)])
            .flat(),
    ];
    return key.join("__");
}
