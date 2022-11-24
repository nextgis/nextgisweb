import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import debounce from "lodash/debounce";
import { useEffect, useMemo, useState } from "react";

import { LoaderCache } from "@nextgisweb/pyramid/util/loader";

import { fetchFeatures } from "../api/fetchFeatures";

const debouncedFn = debounce((fn) => {
    fn();
}, 200);

let queryCache = {};

const loaderCache = new LoaderCache();

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
    LoadingCol,
    resourceId,
    rowMinHeight,
    visibleFields,
}) {
    const [pages, setPages] = useState([]);
    const [hasQueryNextPage, setHasQueryNextPage] = useState(false);
    const [queryTotal, setQueryTotal] = useState(0);
    /** For limit the number of API requests */
    const [fetchEnabled, setFetchEnabled] = useState(false);

    const queryMode = useMemo(() => !!query, [query]);

    const cacheKey = useMemo(() => {
        return [pageSize, query, visibleFields.sort().join("_")].join(
            "__"
        );
    }, [pageSize, query, visibleFields]);

    useEffect(() => {
        loaderCache.clean();
        queryCache = {};
    }, [total]);

    const { data } = useQuery({
        queryKey: [
            "features",
            pages,
            pageSize,
            orderBy,
            query,
            visibleFields,
            total,
        ],
        /**
         * In order to use non-infinite time,
         * we need to synchronize caching with other requests (total, item fields)
         * and with local queryCache
         */
        cacheTime: Infinity,
        staleTime: Infinity,
        enabled: fetchEnabled,
        keepPreviousData: true,
        queryFn: async ({ signal }) => {
            if (pages.length) {
                /**
                 * The queryFn use cache based on `page`, `pageSize` asd `orderBy` parameters.
                 * But the `page` is a array of table visual parts splited by N elements.
                 * So the `page` param may be as [0,1], [1] and [1,2] (and also [0,1,2,3] for a large screen).
                 * Thus we need a cache for each page request to avoid duples.
                 */
                const features = await fetchFeatures({
                    fields: columns
                        .filter((f) => f.id > 0) // ids that are less than one are created for internal purposes and not used in NGW
                        .map((f) => f.keyname),
                    like: query,
                    cache: loaderCache,
                    limit: pageSize,
                    pages,
                    signal,
                    orderBy,
                    resourceId,
                });
                let rowIndex = pages[0];
                for (const f of features) {
                    f.__rowIndex = rowIndex++;
                }
                if (queryMode) {
                    const hasNewPage =
                        features.length / pages.length >= pageSize;
                    const toSize = pages[pages.length - 1] + pageSize;
                    const newTotal = hasNewPage
                        ? toSize + pageSize
                        : toSize - (pageSize - (features.length % pageSize));
                    setQueryTotal(newTotal);
                    setHasQueryNextPage(hasNewPage);

                    const toCache = { loadedCount: newTotal };
                    if (!hasNewPage) {
                        toCache.total = newTotal;
                    }
                    queryCache[cacheKey] = toCache;
                }
                return features;
            }
            return [];
        },
        placeholderData: () => {
            const placeholderData = {};
            for (const c of columns) {
                placeholderData[c.keyname] = <LoadingCol />;
            }
            return Array.from(
                { length: pages.length * pageSize },
                () => placeholderData
            );
        },
    });

    const { getVirtualItems, measureElement, getTotalSize, scrollToIndex } =
        useVirtualizer({
            count: queryMode ? queryTotal : total,
            getScrollElement: () => tbodyRef.current,
            estimateSize: () => rowMinHeight,
        });

    const virtualItems = getVirtualItems();

    useEffect(() => {
        scrollToIndex(0, { smoothScroll: false });

        const { total, loadedCount = pageSize } = queryCache[cacheKey] || {};
        setQueryTotal(loadedCount);
        setHasQueryNextPage(total !== undefined ? false : true);
    }, [query, pageSize, scrollToIndex, cacheKey]);

    useEffect(() => {
        setFetchEnabled(false);
        debouncedFn(() => setFetchEnabled(true));
    }, [pages, pageSize, query]);

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
