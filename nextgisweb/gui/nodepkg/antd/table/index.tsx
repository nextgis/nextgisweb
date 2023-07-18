import { useEffect, useRef } from "react";
import { Table as TableBase } from "antd";

import "./index.less";

type TableBaseProps = Parameters<typeof TableBase>[0];

interface TableProps extends TableBaseProps {
    parentHeight?: boolean;
}

export default function Table({
    className,
    parentHeight = false,
    pagination = false,
    ...props
}: TableProps) {
    const ref = useRef<HTMLDivElement>();

    useEffect(() => {
        if (!parentHeight) return;
        const container = ref.current;
        const resizeObserver = new ResizeObserver(() => {
            const rect = container.getBoundingClientRect();
            ref.current.style.setProperty(
                "--container-height",
                rect.height + "px"
            );
        });
        resizeObserver.observe(container);
        return () => {
            resizeObserver.disconnect();
        };
    }, [parentHeight]);

    if (parentHeight) {
        className = (className ? className.split(" ") : [])
            .concat("ant-table-parent-height")
            .join(" ");
    }

    const tableProps: TableProps = { ...props, pagination, className };

    return <TableBase ref={ref} {...tableProps} />;
}

Table.EXPAND_COLUMN = TableBase.EXPAND_COLUMN;
Table.SELECTION_ALL = TableBase.SELECTION_ALL;
Table.SELECTION_COLUMN = TableBase.SELECTION_COLUMN;
Table.SELECTION_INVERT = TableBase.SELECTION_INVERT;
Table.SELECTION_NONE = TableBase.SELECTION_NONE;

Table.Column = TableBase.Column;
Table.ColumnGroup = TableBase.ColumnGroup;
Table.Summary = TableBase.Summary;
