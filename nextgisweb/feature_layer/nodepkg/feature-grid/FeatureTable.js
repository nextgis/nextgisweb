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
import StraightIcon from "@material-icons/svg/straight";

import TableConfigModal from "./componen./util/renderFeatureFieldValue
import { fetchFeatures } from "./api/fetchFeatures";
import { scrollbarWidth } from "./util/scrollbarWidth";
import { renderFeatureFieldValue } from "./util/renderFeatureFieldValue";
import "./FeatureTable.less";

const RESIZE_HANDLE_WIDTH = 6;

const queryClient = new QueryClient();

const LoadingRow = () => "...";

const debouncedFn = debounce((fn) => {
    fn();
}, 200);

const SortIcon = ({ dir }) => {
    if (dir === "desc") {
        return (
            <span className="desc">
                <StraightIcon />
            </span>
        );
    } else if (dir === "asc") {
        return (
            <span className="asc">
                <StraightIcon />
            </span>
        );
    } else {
        return <></>;
    }
};

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
const FeatureTableComponent = ({
    total,
    resourceId,
    fields,
    query,
    empty,
    settingsOpen,
    setSettingsOpen,
}) => {
    const tbodyRef = useRef(null);
    const theadRef = useRef(null);
    const columnRef = useRef({});

    const [rowMinHeight] = useState(25);
    const [pageSize] = useState(100);
    const [pages, setPages] = useState([]);
    /** Define sort params as tuple of field keyname and ordering (asc|desc) */
    const [orderBy, setOrderBy] = useState([]);
    /** For limit the number of API requests */
    const [fetchEnabled, setFetchEnabled] = useState(false);

    const [tableWidth, setTableWidth] = useState(0);
    const [effectiveWidths, setEffectiveWidths] = useState(null);
    const [userDefinedWidths, setUserDefinedWidths] = useState({});

    const [visibleFields, setVisibleFields] = useState([
        "id",
        ...fields.filter((f) => f.grid_visibility).map((f) => f.keyname),
    ]);

    const queryMode = useMemo(() => !!query, [query]);
    const [hasQueryNextPage, setHasQueryNextPage] = useState(false);
    const [queryTotal, setQueryTotal] = useState(0);

    const scrollBarSize = useMemo(() => scrollbarWidth(), []);

    const toggleSorting = (keyname, curOrder = null) => {
        if (keyname == "id") {
            setOrderBy([]);
            return;
        }
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
            { keyname: "id", display_name: "#", datatype: "INTEGER" },
            ...fields,
        ];

        for (const field of fields_) {
            const { keyname, datatype } = field;
            let flex = {};
            if (keyname === "id") {
                flex = "0 0 5em";
            } else if (datatype === "INTEGER" || datatype === "REAL") {
                flex = "1 1 6em";
            } else {
                flex = "5 5 8em";
            }
            field["flex"] = flex;
        }

        for (const f of fields_) {
            if (visibleFields.includes(f.keyname)) {
                cols.push(f);
            }
        }
        return cols;
    }, [fields, tableWidth, visibleFields]);

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
            getScrollElement: () => tbodyRef.current,
            estimateSize: () => rowMinHeight,
        });

    const virtualItems = getVirtualItems();

    useLayoutEffect(() => {
        const updateTableWidth = () => {
            setTableWidth(tbodyRef.current.offsetWidth);
        };
        const debouncedUpdate = debounce(updateTableWidth, 100);
        const tableResizeObserver = new ResizeObserver(debouncedUpdate).observe(
            tbodyRef.current
        );
        return () => {
            tableResizeObserver.disconnect();
        };
    }, []);

    useLayoutEffect(() => {
        const newEffectiveWidths = {};
        columns.forEach((column, idx) => {
            newEffectiveWidths[idx] =
                columnRef.current[idx].getBoundingClientRect().width;
        });
        setEffectiveWidths(newEffectiveWidths);
        return () => {};
    }, [columns, tableWidth, userDefinedWidths]);

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
                    <>
                        {columns.map((f, i) => {
                            const val = row && row[f.keyname];
                            const renderValue = row ? (
                                renderFeatureFieldValue(f, val) || val
                            ) : (
                                <LoadingRow />
                            );
                            return (
                                <div
                                    key={i}
                                    className="td"
                                    style={{ width: `${effectiveWidths[i]}px` }}
                                >
                                    {renderValue}
                                </div>
                            );
                        })}
                    </>
                );
            };

            return (
                <div
                    key={virtualRow.key}
                    className="tr"
                    data-index={virtualRow.index}
                    ref={measureElement}
                    style={{
                        minHeight: `${rowMinHeight}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                    }}
                >
                    {prepareRow()}
                </div>
            );
        });
    }, [
        data,
        columns,
        pageSize,
        rowMinHeight,
        virtualItems,
        measureElement,
        effectiveWidths,
    ]);

    let isEmpty = total === 0;
    if (queryMode && !isEmpty) {
        isEmpty = !hasQueryNextPage && queryTotal === 0;
    }

    const HeaderCols = useCallback(() => {
        return columns
            .map((column, i) => {
                const { keyname, display_name: label, flex } = column;
                const colSort = orderBy[0] === keyname && orderBy[1];

                const style = userDefinedWidths[i]
                    ? { flex: `0 0 ${userDefinedWidths[i]}px` }
                    : { flex };

                return (
                    <div
                        key={i}
                        ref={(element) => {
                            columnRef.current[i] = element;
                        }}
                        className="th"
                        style={style}
                        onClick={() => toggleSorting(keyname)}
                    >
                        <div className="label">{label}</div>
                        {colSort && (
                            <div className="suffix">
                                <SortIcon dir={colSort} />
                            </div>
                        )}
                    </div>
                );
            })
            .concat([
                <div
                    key="scrollbar"
                    style={{ flex: `0 0 ${scrollBarSize}px` }}
                />,
            ]);
    }, [userDefinedWidths, columns, orderBy]);

    const HeaderHandles = useCallback(() => {
        let cumWidth = 0;
        return columns.map((column, i) => {
            const width = effectiveWidths[i];
            cumWidth += width;
            return (
                <Draggable
                    key={i}
                    axis="x"
                    defaultClassName="handle"
                    defaultClassNameDragging="handle-dragging"
                    defaultClassNameDragged="handle-dragged"
                    onStop={(event, { lastX }) => {
                        setUserDefinedWidths((prev) => ({
                            ...prev,
                            [i]: width + lastX,
                        }));
                    }}
                >
                    <div
                        style={{
                            left: cumWidth - RESIZE_HANDLE_WIDTH / 2,
                            width: RESIZE_HANDLE_WIDTH,
                        }}
                    ></div>
                </Draggable>
            );
        });
    }, [columns, effectiveWidths]);

    return (
        <div className="ngw-feature-layer-feature-table">
            <div ref={theadRef} className="thead">
                <div className="tr">
                    <HeaderCols />
                </div>
                {effectiveWidths && <HeaderHandles />}
            </div>
            <div
                ref={tbodyRef}
                className="tbody-scroller"
                onScroll={() => {
                    theadRef.current.scrollLeft = tbodyRef.current.scrollLeft;
                }}
            >
                {isEmpty && empty ? (
                    empty()
                ) : (
                    <div className="tbody" style={{ height: getTotalSize() }}>
                        {effectiveWidths && <Rows />}
                    </div>
                )}
            </div>
            <TableConfigModal
                isOpen={settingsOpen}
                setIsOpen={setSettingsOpen}
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
