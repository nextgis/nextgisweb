import type { RefObject } from "react";

import type { $FID } from "../constant";
import type { ColOrder, FeatureLayerFieldCol, OrderBy } from "../type";

import { HeaderCol } from "./HeaderCol";

interface HeaderColsProps {
    columns: FeatureLayerFieldCol[];
    orderBy?: OrderBy;
    columnRef: RefObject<Record<number, HTMLDivElement>>;
    scrollBarSize: number;
    userDefinedWidths: Record<number, number>;
    toggleSorting: (field: string | typeof $FID, curOrder?: ColOrder) => void;
}

export function HeaderCols({
    orderBy,
    columns,
    columnRef,
    scrollBarSize,
    userDefinedWidths,
    toggleSorting,
}: HeaderColsProps) {
    return (
        <>
            {columns.map((column) => (
                <HeaderCol
                    key={column.id}
                    column={column}
                    orderBy={orderBy}
                    userDefinedWidths={userDefinedWidths}
                    toggleSorting={toggleSorting}
                    ref={(element) => {
                        if (element) {
                            columnRef.current[column.id] = element;
                        }
                    }}
                />
            ))}
            <div key="scrollbar" style={{ flex: `0 0 ${scrollBarSize}px` }} />
        </>
    );
}
