import debounce from "lodash-es/debounce";
import { observer } from "mobx-react-lite";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import type { FeatureLayerField } from "../type/FeatureLayer";

import { FeatureTableRows } from "./component/FeatureTableRows";
import { HeaderCols } from "./component/HeaderCols";
import { HeaderHandles } from "./component/HeaderHandles";
import { KEY_FIELD_ID, KEY_FIELD_KEYNAME } from "./constant";
import { useFeatureTable } from "./hook/useFeatureTable";
import type { QueryParams } from "./hook/useFeatureTable";
import type {
    EffectiveWidths,
    FeatureLayerFieldCol,
    OrderBy,
    SetValue,
} from "./type";

import "./FeatureTable.less";

interface FeatureTableProps {
    empty: React.ReactElement;
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
}

const FeatureTable = observer(
    ({
        empty,
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

        const EmptyComponent = empty;
        return (
            <div
                className="ngw-feature-layer-feature-table"
                style={themeVariables}
            >
                <div ref={theadRef} className="thead">
                    <div className="tr">
                        <HeaderCols
                            userDefinedWidths={userDefinedWidths}
                            columns={columns}
                            orderBy={orderBy}
                            columnRef={columnRef}
                            setOrderBy={setOrderBy}
                        />
                    </div>
                    {effectiveWidths && (
                        <HeaderHandles
                            columns={columns}
                            effectiveWidths={effectiveWidths}
                            setUserDefinedWidths={setUserDefinedWidths}
                        />
                    )}
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
                    {isEmpty && EmptyComponent ? (
                        EmptyComponent
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
