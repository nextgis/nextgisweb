import debounce from "lodash-es/debounce";
import { observer } from "mobx-react-lite";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Draggable from "react-draggable";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import type { FeatureLayerField } from "../type/FeatureLayer";

import { FeatureTableRows } from "./FeatureTableRows";
import SortIcon from "./component/SortIcon";
import { KEY_FIELD_ID, KEY_FIELD_KEYNAME } from "./constant";
import { useFeatureTable } from "./hook/useFeatureTable";
import type { QueryParams } from "./hook/useFeatureTable";
import type {
    ColOrder,
    EffectiveWidths,
    FeatureLayerFieldCol,
    OrderBy,
    SetValue,
} from "./type";
import { scrollbarWidth } from "./util/scrollbarWidth";

import "./FeatureTable.less";

interface FeatureTableProps {
    total: number;
    fields: FeatureLayerField[];
    version?: number;
    selectedIds: number[];
    resourceId: number;
    queryParams?: QueryParams;
    visibleFields?: number[];
    queryIntersects?: string;
    deletedFeatureIds?: number[];
    cleanSelectedOnFilter?: boolean;
    setSelectedIds: (ids: SetValue<number[]>) => void;
    loadingCol: () => string;
    empty: () => ReactNode;
}

const RESIZE_HANDLE_WIDTH = 6;

const FeatureTable = observer(
    ({
        total,
        fields,
        version,
        resourceId,
        selectedIds,
        queryParams,
        visibleFields = [],
        queryIntersects,
        cleanSelectedOnFilter = true,
        setSelectedIds,
        loadingCol,
        empty,
    }: FeatureTableProps) => {
        const tbodyRef = useRef<HTMLDivElement>(null);
        const theadRef = useRef<HTMLDivElement>(null);
        const columnRef = useRef<Record<number, HTMLDivElement>>({});

        const [rowMinHeight] = useState(27);
        const [pageSize] = useState(100);

        /** Define sort params as tuple of field keyname and ordering (asc|desc) */
        const [orderBy, setOrderBy] = useState<OrderBy>();

        const [tableWidth, setTableWidth] = useState(0);
        const [effectiveWidths, setEffectiveWidths] = useState<EffectiveWidths>(
            {}
        );
        const [userDefinedWidths, setUserDefinedWidths] = useState<
            Record<string, number>
        >({});

        const columns = useMemo<FeatureLayerFieldCol[]>(() => {
            const cols = [];
            const fields_: FeatureLayerFieldCol[] = [
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
                let flex;
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
            queryParams,
            resourceId,
            pageSize,
            tbodyRef,
            columns,
            orderBy,
            version,
            total,
        });

        useEffect(() => {
            if (cleanSelectedOnFilter) {
                setSelectedIds([]);
            }
        }, [
            queryParams,
            queryIntersects,
            cleanSelectedOnFilter,
            setSelectedIds,
        ]);

        const scrollBarSize = useMemo<number>(() => scrollbarWidth(), []);

        const toggleSorting = (keyname: string, curOrder: ColOrder = null) => {
            if (keyname === KEY_FIELD_KEYNAME) {
                setOrderBy(undefined);
                return;
            }
            const sortOrderSeq: ColOrder[] = ["asc", "desc", null];
            setOrderBy((old) => {
                if (old) {
                    const [oldSortKey, oldSortOrder] = old;
                    if (oldSortKey === keyname) {
                        curOrder = oldSortOrder;
                    }
                }
                const curOrderIndex = sortOrderSeq.indexOf(curOrder);
                const nextOrderIndex =
                    (curOrderIndex + 1) % sortOrderSeq.length;
                const nextOrder = sortOrderSeq[nextOrderIndex];
                return [keyname, nextOrder];
            });
        };

        useLayoutEffect(() => {
            const tbodyRefElement = tbodyRef.current;
            if (!tbodyRefElement) {
                throw "unreachable";
            }
            const updateTableWidth = () => {
                setTableWidth(tbodyRefElement.offsetWidth);
            };
            const debouncedUpdate = debounce(updateTableWidth, 100);
            const tableResizeObserver = new ResizeObserver(debouncedUpdate);
            tableResizeObserver.observe(tbodyRefElement);
            return () => {
                tableResizeObserver.disconnect();
            };
        }, []);

        useLayoutEffect(() => {
            const newEffectiveWidths: EffectiveWidths = {};
            for (const { id } of columns) {
                newEffectiveWidths[id] =
                    columnRef.current[id].getBoundingClientRect().width;
            }
            setEffectiveWidths(newEffectiveWidths);
        }, [columns, tableWidth, userDefinedWidths]);

        const themeVariables = useThemeVariables({
            "color-container": "colorBgContainer",
            "color-alter": "colorFillAlter",
            "color-secondary": "colorFillSecondary",
            "color-border": "colorBorderSecondary",
            "color-active": "controlItemBgActive",
            "border-radius": "borderRadius",
            "font-weight-strong": "fontWeightStrong",
        });

        let isEmpty = total === 0;
        if (queryMode && !isEmpty) {
            isEmpty = !hasNextPage && queryTotal === 0;
        }

        const HeaderCols = () => {
            return (
                <>
                    {columns
                        .map((column) => {
                            const {
                                keyname,
                                id,
                                display_name: label,
                                flex,
                            } = column;
                            const colSort =
                                orderBy && orderBy[0] === keyname && orderBy[1];

                            const style = userDefinedWidths[id]
                                ? { flex: `0 0 ${userDefinedWidths[id]}px` }
                                : { flex };

                            return (
                                <div
                                    key={id}
                                    ref={(element) => {
                                        if (element) {
                                            columnRef.current[id] = element;
                                        }
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
                        ])}
                </>
            );
        };

        const HeaderHandles = () => {
            let cumWidth = 0;
            return (
                <>
                    {columns.map(({ id }) => {
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
                                onStop={(_, { lastX }) => {
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
                                        left:
                                            cumWidth - RESIZE_HANDLE_WIDTH / 2,
                                        width: RESIZE_HANDLE_WIDTH,
                                    }}
                                ></div>
                            </Draggable>
                        );
                    })}
                </>
            );
        };

        return (
            <div
                className="ngw-feature-layer-feature-table"
                style={themeVariables}
            >
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
                        if (theadRef.current && tbodyRef.current) {
                            theadRef.current.scrollLeft =
                                tbodyRef.current.scrollLeft;
                        }
                    }}
                >
                    {isEmpty && empty ? (
                        empty()
                    ) : (
                        <div
                            className="tbody"
                            style={{ height: getTotalSize() }}
                        >
                            {effectiveWidths && (
                                <FeatureTableRows
                                    {...{
                                        effectiveWidths,
                                        virtualItems,
                                        rowMinHeight,
                                        selectedIds,
                                        columns,
                                        data,
                                        loadingCol,
                                        measureElement,
                                        setSelectedIds,
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

export default FeatureTable;
