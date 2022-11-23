import {
    useQuery,
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import debounce from "lodash/debounce";
import { PropTypes } from "prop-types";
import {
    useLayoutEffect,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Draggable from "react-draggable";

import TableConfigModal from "./componen./util/renderFeatureFieldValue
import { fetchFeatures } from "./api/fetchFeatures";
import { scrollbarWidth } from "./util/scrollbarWidth";
import { renderFeatureFieldValue } from "./util/renderFeatureFieldValue";
import "./FeatureTable.less";

const queryClient = new QueryClient();

const LoadingRow = () => "...";

const debouncedFn = debounce((fn) => {
    fn();
}, 200);

const queryCache = {};

/**
 * This table component warks in two modes:
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
const FeatureTableComponent = ({ total, resourceId, fields, query, empty }) => {
    const parentRef = useRef(null);

    const [rowMinHeight] = useState(25);
    const [pageSize] = useState(100);
    const [pages, setPages] = useState([]);
    /** Define sort params as tuple of field keyname and ordering (asc|desc) */
    const [orderBy, setOrderBy] = useState([]);
    /** For limit the number of API requests */
    const [fetchEnabled, setFetchEnabled] = useState(false);

    const [totalWidth, setTotalWidth] = useState(0);
    const [widths, setWidths] = useState({});

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const [visibleFields, setVisibleFields] = useState([
        "id",
        ...fields.filter((f) => f.grid_visibility).map((f) => f.keyname),
    ]);

    const queryMode = useMemo(() => !!query, [query]);
    const [hasQueryNextPage, setHasQueryNextPage] = useState(false);
    const [queryTotal, setQueryTotal] = useState(0);

    const scrollBarSize = useMemo(() => scrollbarWidth(), []);

    const toggleSorting = (keyname, curOrder = null) => {
        const sortOrderSeq = ["asc", "desc", null];
        setOrderBy(([oldSortKey, oldSortOrder]) => {
            if (oldSortKey === keyname) {
                curOrder = oldSortOrder;
            }
            const curOrderIndex = sortOrderSeq.indexOf(curOrder);
            const nextOrderIndex = (curOrderIndex + 1) % sortOrderSeq.length;
            const nextOrder = sortOrderSeq[nextOrderIndex];
            return [keyname, nextOrder];
        });
    };

    const columns = useMemo(() => {
        const cols = [];
        const fields_ = [
            { keyname: "id", display_name: "#", width: 100, sorted: false },
            ...fields,
        ];

        let freeWidthColLen = fields_.length;
        let fixedWidth = 0;
        for (const wKey in widths) {
            freeWidthColLen -= 1;
            fixedWidth += widths[wKey].width;
        }
        for (const f of fields_) {
            if (f.width !== undefined && !(f in widths)) {
                freeWidthColLen -= 1;
                fixedWidth += f.width;
            }
        }
        for (const f of fields_) {
            if (visibleFields.includes(f.keyname)) {
                const width =
                    widths[f.keyname] ??
                    (totalWidth - fixedWidth) / freeWidthColLen;
                cols.push({
                    width,
                    ...f,
                    sorted: f.sorted ?? true,
                });
            }
        }
        return cols;
    }, [fields, totalWidth, widths, visibleFields]);

    const cacheKey = useMemo(() => {
        return [pageSize, query, visibleFields.sort().join("_")].join("__");
    }, [pageSize, query, visibleFields]);

    const { data } = useQuery({
        queryKey: ["features", pages, pageSize, orderBy, query, visibleFields],
        staleTime: Infinity,
        /**
         * In order to use non-infinite time,
         * we need to synchronize caching with other requests (total, item fields)
         * and with local queryCache
         */
        cacheTime: Infinity,
        enabled: fetchEnabled && (queryMode ? hasQueryNextPage : true),
        queryFn: async ({ signal }) => {
            if (pages.length) {
                /**
                 * The queryFn use cache based on `page`, `pageSize` asd `orderBy` parameters.
                 * But the `page` is a array of table visual parts splited by N elements.
                 * So the `page` param may be as [0,1], [1] and [1,2] (and also [0,1,2,3] for a large screen).
                 * Thus we need a cache for each page request to avoid duples.
                 */
                const features = await fetchFeatures({
                    fields: visibleFields.filter((f) => f !== "id"),
                    like: query,
                    cache: true,
                    limit: pageSize,
                    pages,
                    signal,
                    orderBy,
                    resourceId,
                });
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
                if (features.length === 1) {
                    return [features[0], features[0]];
                }
                return features;
            }
            return [];
        },
        placeholderData: () => {
            const placeholderData = {};
            for (const c of columns) {
                placeholderData[c.keyname] = <LoadingRow />;
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
            getScrollElement: () => parentRef.current,
            estimateSize: () => rowMinHeight,
        });

    const virtualItems = getVirtualItems();

    useLayoutEffect(() => {
        const updateTableWidth = () => {
            setTotalWidth(parentRef.current.offsetWidth);
        };
        const debouncedUpdate = debounce(updateTableWidth, 100);
        const tableResizeObserver = new ResizeObserver(debouncedUpdate).observe(
            parentRef.current
        );
        return () => {
            tableResizeObserver.disconnect();
        };
    }, []);

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

    const resizeRow = useCallback(
        ({ colKey, deltaX }) => {
            setWidths((prevWidths) => {
                const colWidth =
                    prevWidths[colKey] ?? totalWidth / columns.length;
                const percentDelta = deltaX;

                const newWidths = {
                    ...prevWidths,
                    [colKey]: colWidth + percentDelta,
                };

                const colIndex = columns.findIndex((c) => c.keyname === colKey);

                if (colIndex !== -1) {
                    const nextCol = columns[colIndex + 1];
                    if (nextCol) {
                        const nextColKey = nextCol.keyname;
                        const nextColWidth =
                            prevWidths[nextColKey] ??
                            totalWidth / columns.length;
                        newWidths[nextColKey] = nextColWidth - percentDelta;
                    }
                }
                return newWidths;
            });
        },
        [totalWidth, columns]
    );

    const Rows = useCallback(() => {
        const firstVirtual = virtualItems[0];
        if (!firstVirtual) {
            return null;
        }
        const startIndex = virtualItems[0].index;
        const dataDelta = startIndex % pageSize;
        return virtualItems.map((virtualRow) => {
            const prepareRow = () => {
                let row = null;
                if (data) {
                    const dataIndex = virtualRow.index - startIndex + dataDelta;
                    const dataRow = data[dataIndex];
                    if (dataRow) {
                        row = dataRow;
                    }
                }
                return (
                    <div className="tr" style={{ width: "100%" }}>
                        {columns.map((f) => {
                            const val = row && row[f.keyname];
                            const renderValue = row ? (
                                renderFeatureFieldValue(f, val) || val
                            ) : (
                                <LoadingRow />
                            );
                            return (
                                <div
                                    key={f.keyname}
                                    className="td"
                                    style={{
                                        width: `${f.width}px`,
                                        overflow: "hidden",
                                    }}
                                >
                                    {renderValue}
                                </div>
                            );
                        })}
                    </div>
                );
            };

            return (
                <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={measureElement}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                    }}
                >
                    <div style={{ minHeight: `${rowMinHeight}px` }}>
                        {prepareRow()}
                    </div>
                </div>
            );
        });
    }, [data, columns, pageSize, rowMinHeight, virtualItems, measureElement]);

    let isEmpty = total === 0;
    if (queryMode && !isEmpty) {
        isEmpty = !hasQueryNextPage && queryTotal === 0;
    }

    const HeaderCols = useCallback(() => {
        return columns.map((column, i) => {
            const { keyname, display_name, width, sorted } = column;
            const withResize = i + 1 < columns.length;
            const colSort = orderBy[0] === keyname && orderBy[1];
            let sortOrder = null;
            if (colSort && sorted) {
                sortOrder = {
                    asc: " 🔼",
                    desc: " 🔽",
                }[colSort];
            }
            const closable = keyname !== "id";
            const closeIcon = closable ? (
                <span
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setVisibleFields((oldFields) =>
                            oldFields.filter((f) => f !== keyname)
                        );
                    }}
                >
                    ✖
                </span>
            ) : null;
            return (
                <div
                    key={keyname}
                    className="td"
                    style={{
                        width: `${width}px`,
                        overflow: "hidden",
                    }}
                >
                    <div
                        className="header-row-label"
                        onClick={() => {
                            if (sorted) {
                                toggleSorting(keyname);
                            }
                        }}
                    >
                        {display_name}
                        {closeIcon}
                        {sortOrder}
                    </div>

                    {withResize ? (
                        <Draggable
                            axis="x"
                            defaultClassName="drag-handle"
                            defaultClassNameDragging="drag-handle-active"
                            onDrag={(event, { deltaX }) =>
                                resizeRow({
                                    colKey: keyname,
                                    deltaX,
                                })
                            }
                            position={{ x: 0 }}
                            zIndex={999}
                        >
                            <div className="drag-handle-icon">⋮</div>
                        </Draggable>
                    ) : null}
                </div>
            );
        });
    }, [columns, orderBy, resizeRow]);

    return (
        <div className="ngw-feature-layer-feature-table">
            <div className="thead">
                <button onClick={() => setIsConfigModalOpen(true)}>
                    Table config
                </button>
                <div
                    className="tr header-row"
                    style={{ paddingRight: `${scrollBarSize}px` }}
                >
                    <HeaderCols />
                </div>
            </div>
            <div ref={parentRef} className="tbody-scroller">
                {isEmpty && empty ? (
                    empty()
                ) : (
                    <div className="tbody" style={{ height: getTotalSize() }}>
                        <Rows />
                    </div>
                )}
            </div>
            <TableConfigModal
                isOpen={isConfigModalOpen}
                setIsOpen={setIsConfigModalOpen}
                visibleFields={visibleFields}
                setVisibleFields={setVisibleFields}
                fields={fields}
            />
        </div>
    );
};

FeatureTableComponent.propTypes = {
    fields: PropTypes.arrayOf(PropTypes.object),
    query: PropTypes.any,
    resourceId: PropTypes.number,
    total: PropTypes.number,
    empty: PropTypes.func,
};

export default function FutureTable(props) {
    return (
        <QueryClientProvider client={queryClient}>
            <FeatureTableComponent {...props} />
        </QueryClientProvider>
    );
}
