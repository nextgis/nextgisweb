import debounce from "lodash/debounce";
import { useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import Draggable from "react-draggable";

import SortIcon from "./component/SortIcon";
import TableConfigModal from "./component/TableConfigModal";
import { KEY_FIELD_ID, KEY_FIELD_KEYNAME } from "./constant";
import { useFeatureTable } from "./hook/useFeatureTable";
import { renderFeatureFieldValue } from "./util/renderFeatureFieldValue";
import { scrollbarWidth } from "./util/scrollbarWidth";

import type { ReactNode, ReactElement, Dispatch, SetStateAction } from "react";
import type { FeatureLayerField } from "../type/FeatureLayer";
import type { Selected } from "./type";

import "./FeatureTable.less";

interface FeatureTableProps {
    cleanSelectedOnFilter?: boolean;
    deletedFeatureIds?: number[];
    empty?: () => ReactNode;
    fields?: FeatureLayerField[];
    loadingCol?: () => string;
    query?: string;
    resourceId: number;
    selected?: Selected[];
    setSelected: Dispatch<SetStateAction<Selected[]>>;
    setSettingsOpen?: Dispatch<SetStateAction<boolean>>;
    settingsOpen?: boolean;
    total?: number;
}

interface FeatureLayerFieldCol extends FeatureLayerField {
    flex?: string;
}

const RESIZE_HANDLE_WIDTH = 6;

const FeatureTable = ({
    empty,
    total,
    query,
    fields,
    selected,
    resourceId,
    loadingCol,
    setSelected,
    settingsOpen,
    setSettingsOpen,
    cleanSelectedOnFilter = true,
}: FeatureTableProps) => {
    const tbodyRef = useRef<HTMLDivElement>(null);
    const theadRef = useRef<HTMLDivElement>(null);
    const columnRef = useRef<Record<number, HTMLDivElement>>({});

    const [rowMinHeight] = useState(27);
    const [pageSize] = useState(100);

    /** Define sort params as tuple of field keyname and ordering (asc|desc) */
    const [orderBy, setOrderBy] = useState<string[]>([]);

    const [tableWidth, setTableWidth] = useState(0);
    const [effectiveWidths, setEffectiveWidths] = useState(null);
    const [userDefinedWidths, setUserDefinedWidths] = useState({});

    const [visibleFields, setVisibleFields] = useState<number[]>(() => [
        KEY_FIELD_ID,
        ...fields.filter((f) => f.grid_visibility).map((f) => f.id),
    ]);

    const columns = useMemo<FeatureLayerFieldCol[]>(() => {
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
        hasNextPage,
        virtualItems,
        getTotalSize,
        measureElement,
    } = useFeatureTable({
        visibleFields,
        rowMinHeight,
        resourceId,
        pageSize,
        tbodyRef,
        columns,
        orderBy,
        query,
        total,
    });

    useEffect(() => {
        if (cleanSelectedOnFilter) {
            setSelected([]);
        }
    }, [query, cleanSelectedOnFilter, setSelected]);

    const scrollBarSize = useMemo<number>(() => scrollbarWidth(), []);

    const toggleSorting = (keyname: string, curOrder: string | null = null) => {
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
        const tableResizeObserver = new ResizeObserver(debouncedUpdate);
        tableResizeObserver.observe(tbodyRef.current);
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

    const rows = () => {
        const firstVirtual = virtualItems[0];
        if (!firstVirtual) {
            return null;
        }

        const prepareCols = (row) => {
            return (
                <>
                    {columns.map((f) => {
                        const val = row && row[f.keyname];
                        const renderValue = row
                            ? renderFeatureFieldValue(f, val) || val
                            : loadingCol();
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

            const row = data.find((d) => d.__rowIndex === virtualRow.index);
            if (row) {
                isSelected = !!selected.find(
                    (s) => s[KEY_FIELD_KEYNAME] === row[KEY_FIELD_KEYNAME]
                );
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
    };

    let isEmpty = total === 0;
    if (queryMode && !isEmpty) {
        isEmpty = !hasNextPage && queryTotal === 0;
    }

    const headerCols = () => {
        const headers: ReactElement[] = columns.map((column) => {
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
        });
        headers.push(
            <div key="scrollbar" style={{ flex: `0 0 ${scrollBarSize}px` }} />
        );
        return headers;
    };

    const headerHandles = () => {
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
    };

    return (
        <div className="ngw-feature-layer-feature-table">
            <div ref={theadRef} className="thead">
                <div className="tr">{headerCols()}</div>
                {effectiveWidths && headerHandles()}
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
                        {effectiveWidths && rows()}
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

export default FeatureTable;
