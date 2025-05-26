import { Table as TableBase } from "antd";
import type { AnyObject } from "antd/es/_util/type";
import type { TableProps as AntTableProps } from "antd/es/table";
import classNames from "classnames";
import type { Reference } from "rc-table";
import { forwardRef } from "react";

import "./index.less";

export interface TableProps<D = any> extends AntTableProps<D> {
    card?: boolean;
    parentHeight?: boolean;
}

export type TableRef = Reference;

function TableInner<D extends AnyObject = AnyObject>(
    {
        className,
        style,
        card,
        parentHeight,
        bordered,
        pagination = false,
        ...props
    }: TableProps<D>,
    ref: React.Ref<TableRef>
) {
    className = classNames(className, {
        "ant-table-card": card,
        "ant-table-parent-height": parentHeight,
    });

    if (card) bordered = true;

    const tableProps: AntTableProps<D> = {
        className,
        style,
        bordered,
        pagination,
        ...props,
    };

    return <TableBase {...tableProps} ref={ref} />;
}

type ForwardTable = <D extends AnyObject = AnyObject>(
    props: TableProps<D> & React.RefAttributes<Reference>
) => React.ReactElement | null;

const Table = forwardRef<Reference, TableProps<any>>(
    TableInner
) as unknown as ForwardTable & typeof TableBase;

Table.EXPAND_COLUMN = TableBase.EXPAND_COLUMN;
Table.SELECTION_ALL = TableBase.SELECTION_ALL;
Table.SELECTION_COLUMN = TableBase.SELECTION_COLUMN;
Table.SELECTION_INVERT = TableBase.SELECTION_INVERT;
Table.SELECTION_NONE = TableBase.SELECTION_NONE;

Table.Column = TableBase.Column;
Table.ColumnGroup = TableBase.ColumnGroup;
Table.Summary = TableBase.Summary;

export default Table;

export type { ColumnProps } from "antd/es/table";
