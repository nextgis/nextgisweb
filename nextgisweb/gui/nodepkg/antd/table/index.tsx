import { Table as TableBase } from "antd";

import type { ParamsOf } from "../../type";

import "./index.less";

export interface TableProps extends ParamsOf<typeof TableBase> {
    parentHeight?: boolean;
}

export default function Table({
    className,
    parentHeight = false,
    pagination = false,
    ...props
}: TableProps) {
    if (parentHeight) {
        className = (className ? className.split(" ") : [])
            .concat("ant-table-parent-height")
            .join(" ");
    }

    const tableProps: TableProps = { ...props, pagination, className };

    return <TableBase {...tableProps} />;
}

Table.EXPAND_COLUMN = TableBase.EXPAND_COLUMN;
Table.SELECTION_ALL = TableBase.SELECTION_ALL;
Table.SELECTION_COLUMN = TableBase.SELECTION_COLUMN;
Table.SELECTION_INVERT = TableBase.SELECTION_INVERT;
Table.SELECTION_NONE = TableBase.SELECTION_NONE;

Table.Column = TableBase.Column;
Table.ColumnGroup = TableBase.ColumnGroup;
Table.Summary = TableBase.Summary;
