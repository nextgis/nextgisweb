import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import debounce from "lodash/debounce";

import { LoaderCache } from "@nextgisweb/pyramid/util/loader";

import { fetchFeatures } from "../api/fetchFeatures";
import { createCacheKey } from "../util/createCacheKey";

const debouncedFn = debounce((fn) => {
    fn();
}, 200);

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
 *   │          > set `hasQueryNextPage` to `false`
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
}) {
    const [pages, setPages] = useState([]);
    // const [fetchEnabled, setFetchEnabled] = useState(false);
    const [hasQueryNextPage, setHasQueryNextPage] = useState(false);
    const [queryTotal, setQueryTotal] = useState(0);

    /** For limit the number of API requests */
    const [fetchEnabled, setFetchEnabled] = useState(false);

    const abortController = useRef();
    const loaderCache = useRef(new LoaderCache());

    const abort = () => {
        if (abortController.current) {
            return abortController.current.abort();
        }
        abortController.current = null;
    };
    const createSignal = useCallback(() => {
        abort();
        abortController.current = new AbortController();
        return abortController.current.signal;
    }, []);

    const [data, setData] = useState();

    const queryMode = useMemo(() => !!query, [query]);

    useEffect(() => {
        setFetchEnabled(false);
        debouncedFn(() => setFetchEnabled(true));
    }, [pages, pageSize, query]);

    const handleFeatures = useCallback(
        (features) => {
            let rowIndex = pages[0];
            for (const f of features) {
                f.__rowIndex = rowIndex++;
            }
            if (queryMode) {
                const hasNewPage = features.length / pages.length >= pageSize;
                const toSize = pages[pages.length - 1] + pageSize;
                const newTotal = hasNewPage
                    ? toSize + pageSize
                    : toSize - (pageSize - (features.length % pageSize));
                setQueryTotal(newTotal);
                setHasQueryNextPage(hasNewPage);
            }
            setData(features);
        },
        [pageSize, pages, queryMode]
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
                const signal = createSignal();
                const promises = [];
                for (const { key, page } of cacheKeys) {
                    if (pages.includes(page)) {
                        promises.push(
                            loaderCache.current
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
                                        like: query,
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
                                })
                        );
                    }
                }
                const parts = await Promise.all(promises);
                const features = [];
                for (const p of parts.flat()) {
                    if (p) {
                        features.push(p);
                    }
                }
                handleFeatures(features);
            }
        } else {
            handleFeatures([]);
        }
    }, [
        handleFeatures,
        visibleFields,
        fetchEnabled,
        createSignal,
        resourceId,
        pageSize,
        columns,
        orderBy,
        pages,
        query,
    ]);

    const { getVirtualItems, measureElement, getTotalSize, scrollToIndex } =
        useVirtualizer({
            count: queryMode ? queryTotal : total,
            getScrollElement: () => tbodyRef.current,
            estimateSize: () => rowMinHeight,
        });

    const virtualItems = getVirtualItems();

    useEffect(() => {
        loaderCache.current.clean();
    }, [total]);

    useEffect(() => {
        queryFn();
    }, [
        visibleFields,
        fetchEnabled,
        pageSize,
        orderBy,
        queryFn,
        query,
        total,
        pages,
    ]);

    useEffect(() => {
        setData([]);
        scrollToIndex(0, { smoothScroll: false });

        const { total, loadedCount = pageSize } = {};
        setQueryTotal(loadedCount);
        setHasQueryNextPage(total !== undefined ? false : true);
    }, [query, pageSize, scrollToIndex]);

    useEffect(() => {
        const items = [...virtualItems];

        if (items.length) {
            const from = items[0].index;
            const to = items[items.length - 1].index;

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
        virtualItems,
        getTotalSize,
        measureElement,
        hasQueryNextPage,
    };
}
