import { PropTypes } from "prop-types";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import debounce from "lodash/debounce";
import {
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useEffect,
} from "react";
import Draggable from "react-draggable";

import SortIcon from "./component/SortIcon";
import TableConfigModal from "./component/TableConfigModal";
import { KEY_FIELD_ID, KEY_FIELD_KEYNAME } from "./constant";
import { useFeatureTable } from "./hook/useFeatureTable";
import { renderFeatureFieldValue } from "./util/renderFeatureFieldValue";
import { scrollbarWidth } from "./util/scrollbarWidth";

import "./FeatureTable.less";

const RESIZE_HANDLE_WIDTH = 6;

const queryClient = new QueryClient();

const FeatureTableComponent = ({
    empty,
    total,
    query,
    fields,
    selected,
    resourceId,
    LoadingCol,
    setSelected,
    settingsOpen,
    setSettingsOpen,
}) => {
    const tbodyRef = useRef(null);
    const theadRef = useRef(null);
    const columnRef = useRef({});

    const [rowMinHeight] = useState(25);
    const [pageSize] = useState(100);

    /** Define sort params as tuple of field keyname and ordering (asc|desc) */
    const [orderBy, setOrderBy] = useState([]);

    const [tableWidth, setTableWidth] = useState(0);
    const [effectiveWidths, setEffectiveWidths] = useState(null);
    const [userDefinedWidths, setUserDefinedWidths] = useState({});

    const [visibleFields, setVisibleFields] = useState([
        KEY_FIELD_ID,
        ...fields.filter((f) => f.grid_visibility).map((f) => f.id),
    ]);

    const columns = useMemo(() => {
        const cols = [];
        const fields_ = [
            {
                id: KEY_FIELD_ID,
                keyname: KEY_FIELD_KEYNAME, // keyname for toggleSorting
                display_name: "#",
                datatype: "INTEGER",
            },
            ...fields,
        ];

        for (const field of fields_) {
            const { id, datatype } = field;
            let flex = {};
            if (id === KEY_FIELD_ID) {
                flex = "0 0 5em";
            } else if (datatype === "INTEGER" || datatype === "REAL") {
                flex = "1 1 6em";
            } else {
                flex = "5 5 8em";
            }
            field["flex"] = flex;
        }

        for (const f of fields_) {
            if (visibleFields.includes(f.id)) {
                cols.push(f);
            }
        }
        return cols;
    }, [fields, visibleFields]);

    const {
        data,
        queryMode,
        queryTotal,
        virtualItems,
        getTotalSize,
        measureElement,
        hasQueryNextPage,
    } = useFeatureTable({
        visibleFields,
        rowMinHeight,
        resourceId,
        LoadingCol,
        pageSize,
        tbodyRef,
        columns,
        orderBy,
        query,
        total,
    });

    useEffect(() => {
        setSelected([]);
    }, [query, setSelected]);

    const scrollBarSize = useMemo(() => scrollbarWidth(), []);

    const toggleSorting = (keyname, curOrder = null) => {
        if (keyname === KEY_FIELD_KEYNAME) {
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
        for (const { id } of columns) {
            newEffectiveWidths[id] =
                columnRef.current[id].getBoundingClientRect().width;
        }
        setEffectiveWidths(newEffectiveWidths);
        return () => {};
    }, [columns, tableWidth, userDefinedWidths]);

    const Rows = useCallback(() => {
        const firstVirtual = virtualItems[0];
        if (!firstVirtual) {
            return null;
        }
        const startIndex = virtualItems[0].index;
        const dataDelta = startIndex % pageSize;

        const prepareCols = (row) => {
            return (
                <>
                    {columns.map((f) => {
                        const val = row && row[f.keyname];
                        const renderValue = row ? (
                            renderFeatureFieldValue(f, val) || val
                        ) : (
                            <LoadingCol />
                        );
                        return (
                            <div
                                key={f.id}
                                className="td"
                                style={{
                                    width: `${effectiveWidths[f.id]}px`,
                                }}
                            >
                                {renderValue}
                            </div>
                        );
                    })}
                </>
            );
        };

        return virtualItems.map((virtualRow) => {
            let isSelected = false;
            let className = "tr";

            let row = null;
            if (data) {
                const dataIndex = virtualRow.index - startIndex + dataDelta;
                const dataRow = data[dataIndex];
                if (dataRow && dataRow.__rowIndex === virtualRow.index) {
                    row = dataRow;

                    isSelected = selected.find(
                        (s) => s[KEY_FIELD_KEYNAME] === row[KEY_FIELD_KEYNAME]
                    );
                }
            }
            if (isSelected) {
                className += " selected";
            }
            return (
                <div
                    key={virtualRow.key}
                    className={className}
                    data-index={virtualRow.index}
                    ref={measureElement}
                    style={{
                        minHeight: `${rowMinHeight}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => {
                        if (isSelected) {
                            setSelected((old) =>
                                old.filter(
                                    (o) =>
                                        o[KEY_FIELD_KEYNAME] !==
                                        isSelected[KEY_FIELD_KEYNAME]
                                )
                            );
                        } else if (row) {
                            setSelected([row]);
                        }
                    }}
                >
                    {prepareCols(row)}
                </div>
            );
        });
    }, [
        data,
        columns,
        selected,
        pageSize,
        setSelected,
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
            .map((column) => {
                const { keyname, id, display_name: label, flex } = column;
                const colSort = orderBy[0] === keyname && orderBy[1];

                const style = userDefinedWidths[id]
                    ? { flex: `0 0 ${userDefinedWidths[id]}px` }
                    : { flex };

                return (
                    <div
                        key={id}
                        ref={(element) => {
                            columnRef.current[id] = element;
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
    }, [userDefinedWidths, columns, orderBy, scrollBarSize]);

    const HeaderHandles = useCallback(() => {
        let cumWidth = 0;
        return columns.map(({ id }) => {
            const width = effectiveWidths[id];
            if (isNaN(width)) {
                return null;
            }
            cumWidth += width;
            return (
                <Draggable
                    key={id}
                    axis="x"
                    defaultClassName="handle"
                    defaultClassNameDragging="handle-dragging"
                    defaultClassNameDragged="handle-dragged"
                    onStop={(event, { lastX }) => {
                        setTimeout(() => {
                            setUserDefinedWidths((prev) => ({
                                ...prev,
                                [id]: width + lastX,
                            }));
                        });
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
    LoadingCol: PropTypes.func,
    empty: PropTypes.func,
    fields: PropTypes.arrayOf(PropTypes.object),
    deletedFeatureIds: PropTypes.arrayOf(PropTypes.number),
    query: PropTypes.string,
    resourceId: PropTypes.number,
    selected: PropTypes.arrayOf(PropTypes.object),
    setSelected: PropTypes.func,
    setSettingsOpen: PropTypes.func,
    settingsOpen: PropTypes.bool,
    total: PropTypes.number,
};

export default function FutureTable(props) {
    return (
        <QueryClientProvider client={queryClient}>
            <FeatureTableComponent {...props} />
        </QueryClientProvider>
    );
}
