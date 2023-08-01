import { useVirtualizer } from "@tanstack/react-virtual";
import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { LoaderCache } from "@nextgisweb/pyramid/util/loader";

import { fetchFeatures } from "../api/fetchFeatures";
import { createCacheKey } from "../util/createCacheKey";

import type { MutableRefObject } from "react";
import type { FeatureData, FeatureLayerFieldCol, OrderBy } from "../type";

const debouncedFn = debounce((fn) => {
    fn();
}, 200);

interface UseFeatureTableProps {
    total?: number;
    query?: string;
    columns?: FeatureLayerFieldCol[];
    orderBy?: OrderBy;
    pageSize?: number;
    tbodyRef?: MutableRefObject<HTMLElement>;
    resourceId?: number;
    rowMinHeight?: number;
    visibleFields?: number[];
}

/**
 * This table component works in two modes:
 * 1. Static size = total layer size - full data in the table, without any filters.
 *    In this case, the `pages` can be loaded in any order
 *    depending on the position of the `scrollbar`,
 *    the height of which is estimated from the `assumed` (not loaded yet)
 *    and `actual` (already loaded) values of the height of the rows
 *
 *   > orderBy - by field keyname(asc|desc)
 *   │
 *   ├oooooooooo┼oo╫oooooo┼~~~~~~~╫~~┼..........┼──────────┤ Total
 *   ^   page   ^  ^ virtualItems ^
 *       with              │
 *     pageSize            │
 *         │               │
 *         │               ├─╫oo~~..╫─ - virtualItems rows count,
 *         │               │             depends on the height of the table HTML element.
 *         │               │
 *         │               ├─┼~~~~~~┼─ - pages intersected with the visible range
 *         │               │
 *         │               ├─┼oooooo┼─ - already loaded and cached paged
 *         │               │
 *         │               └─┼──────┼─ - never displayed, not yet loaded data
 *         │
 *         └─ defines the number of features loaded per API request to formate one page
 *
 * 2. Dynamic size <= total layer size - part of the layer data matching the filter conditions.
 *    In this mode, the `data` is loaded `page by page` until the number of items less
 *    than the `pageSize` returns from the server.
 *    It is unknown how many rows there will be with this filter in total.
 *
 *   > orderBy - by field keyname(asc|desc)
 *   > query   - string filter
 *   │
 *   │ Step 1 - > scroll to not yet loaded page
 *   │          > start loading data for page 3 (p3)
 *   │
 *   │   p1          p2         p3
 *   ├oooooooooo|ooo╫oooooo┼..╫.......┤ queryTotal
 *   │          │   ^ visible ^       │
 *   │          │      range          │
 *   │          │          │          │
 *   │ Step 2 - > load and cache p3 date
 *   │          > update the queryTotal size to increase the scroll area of the table,
 *   │            allowing you to load new page data.
 *   │          │          │          │
 *   ├oooooooooo|ooo╫oooooo┼oo╫ooooooo┤..........┤ queryTotal + 1*pageSize
 *   │
 *   │ Step 3 - > get to the end of the table
 *   │          > decrease the queryTotal size
 *   │          > set `hasNextPage` to `false`
 *   │
 *   └oooooooooo|oooooooooo┼oooooooooo╫oooxxxxxx╫┤ queryTotal - (pageSize - loadedItemsLength)
 *                                        ^    ^
 *            the `lack` of these items `indicates` that there are `no more pages`
 */
export function useFeatureTable({
    total,
    query,
    columns,
    orderBy,
    pageSize,
    tbodyRef,
    resourceId,
    rowMinHeight,
    visibleFields,
}: UseFeatureTableProps) {
    const [pages, setPages] = useState([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [queryTotal, setQueryTotal] = useState(0);

    /** For limit the number of API requests */
    const [fetchEnabled, setFetchEnabled] = useState(false);

    const { makeSignal, abort } = useAbortController();

    const loaderCache = useRef<LoaderCache<FeatureData>>();

    const [data, setData_] = useState<FeatureData[]>([]);

    const setData = (features: FeatureData[]) => {
        setData_((old) => {
            if (!old.length && !features.length) {
                return old;
            }
            return features;
        });
    };

    const queryMode = useMemo<boolean>(() => !!query, [query]);

    const handleFeatures = useCallback(
        (features: FeatureData[]) => {
            let rowIndex = pages[0];
            for (const f of features) {
                f.__rowIndex = rowIndex++;
            }
            const hasNewPage = features.length / pages.length >= pageSize;
            setHasNextPage(hasNewPage);
            if (queryMode) {
                const toSize = pages[0] + pageSize * pages.length;
                const newTotal = hasNewPage
                    ? toSize + pageSize
                    : toSize - (pageSize - (features.length % pageSize));
                setQueryTotal(newTotal);
            }
            setData(features);
        },
        [pageSize, pages, queryMode]
    );

    const fetchWrapper = useCallback(
        ({
            page,
            signal,
            key,
        }: {
            page: number;
            signal: AbortSignal;
            key: string;
        }) => {
            return loaderCache.current
                .promiseFor(key, () => {
                    return fetchFeatures({
                        fields: columns
                            // ids that are less than one are created for
                            // internal purposes and not used in NGW
                            .filter((f) => f.id > 0)
                            .map((f) => f.keyname),
                        limit: pageSize,
                        cache: false,
                        offset: page,
                        ilike: query,
                        resourceId,
                        orderBy,
                        signal,
                    });
                })
                .catch((er) => {
                    if (er && er.name === "AbortError") {
                        // ignore abort error
                    } else {
                        throw er;
                    }
                });
        },
        [columns, orderBy, pageSize, query, resourceId]
    );

    const queryFn = useCallback(async () => {
        abort();
        if (pages.length) {
            const cache = loaderCache.current;

            const cacheKeys = pages.map((page) => ({
                page,
                key: createCacheKey({
                    visibleFields,
                    pageSize,
                    orderBy,
                    query,
                    page,
                }),
            }));
            const allPageLoaded = cacheKeys.every((c) =>
                cache.fulfilled(c.key)
            );

            if (allPageLoaded) {
                const features = (
                    await Promise.all(
                        cacheKeys.map((c) => cache.resolve(c.key))
                    )
                ).flat();
                handleFeatures(features);
            } else if (fetchEnabled) {
                const signal = makeSignal();
                const promises = [];
                for (const { key, page } of cacheKeys) {
                    if (pages.includes(page)) {
                        promises.push(fetchWrapper({ page, signal, key }));
                    }
                }
                const parts = await Promise.all(promises);
                const features = [];
                // Fulfilled `parts` from `cache` are not cancelable and always return values
                // Therefore, if there was aborted,
                // the number of `features` will not mutch to the number of `pages`
                if (parts.every(Boolean)) {
                    for (const p of parts.flat()) {
                        if (p) {
                            features.push(p);
                        }
                    }
                    handleFeatures(features);
                }
            }
        }
    }, [
        handleFeatures,
        visibleFields,
        fetchEnabled,
        fetchWrapper,
        makeSignal,
        pageSize,
        orderBy,
        pages,
        query,
        abort,
    ]);

    const count = useMemo(
        () => (queryMode ? queryTotal : total),
        [queryMode, queryTotal, total]
    );

    const { getVirtualItems, measureElement, getTotalSize, scrollToIndex } =
        useVirtualizer({
            count,
            getScrollElement: () => tbodyRef.current,
            estimateSize: () => rowMinHeight,
        });

    const virtualItems = getVirtualItems();

    useEffect(() => {
        loaderCache.current = new LoaderCache();
    }, []);

    useEffect(() => {
        loaderCache.current.clean();
    }, [total]);

    useEffect(() => {
        setFetchEnabled(false);
        debouncedFn(() => setFetchEnabled(true));
    }, [pages, pageSize, query, orderBy]);

    const prevTotal = useRef(total);
    useEffect(() => {
        if (total === prevTotal.current && pages.length && data.length) {
            const firstDataIndex = data[0].__rowIndex;
            const lastDataIndex = data[data.length - 1].__rowIndex;
            const lastPageIndex = pages[0] + pageSize * pages.length - 1;

            const currentDataInTheRange =
                firstDataIndex === pages[0] &&
                (hasNextPage
                    ? lastDataIndex === lastPageIndex
                    : lastDataIndex <= lastPageIndex);
            if (currentDataInTheRange) {
                return;
            }
        }
        queryFn();
    }, [
        visibleFields,
        fetchEnabled,
        hasNextPage,
        pageSize,
        orderBy,
        queryFn,
        query,
        total,
        pages,
        data,
    ]);

    // Update prevTotal only after useEffect with queryFn call!
    useEffect(() => {
        prevTotal.current = total;
    }, [total]);

    useEffect(() => {
        setData([]);
    }, [orderBy, query, visibleFields]);

    useEffect(() => {
        if (getTotalSize()) {
            scrollToIndex(0, { behavior: "smooth" });
        }
        // to init first loading
        setQueryTotal(pageSize);
    }, [query, pageSize, scrollToIndex, getTotalSize, total]);

    useEffect(() => {
        const items = [...virtualItems];

        if (items.length) {
            const from = items[0].index;
            // Trigger for loading at least one page
            const to = items[items.length - 1].index + 1;

            const fromPage = Math.floor(from / pageSize);
            const toPage = Math.ceil(to / pageSize);

            const offsetsToLoad = Array.from(
                { length: toPage - fromPage },
                (_, idx) => (fromPage + idx) * pageSize
            );
            if (offsetsToLoad.length) {
                setPages(offsetsToLoad);
            }
        }
    }, [virtualItems, pageSize]);

    return {
        data,
        queryMode,
        queryTotal,
        hasNextPage,
        virtualItems,
        getTotalSize,
        measureElement,
    };
}
