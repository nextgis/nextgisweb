import { useEffect, useRef } from "react";
import { Table as TableBase } from "antd";

import "./index.less";

export default function Table({
    className,
    parentHeight = false,
    pagination = false,
    ...props
}) {
    const ref = useRef();

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
    }, []);

    if (parentHeight) {
        className = (className ? className.split(" ") : [])
            .concat("ant-table-parent-height")
            .join(" ");
    }
    return (
        <TableBase
            {...(parentHeight ? { ref } : {})}
            {...{ pagination, className }}
            {...props}
        />
    );
}

Table.EXPAND_COLUMN = TableBase.EXPAND_COLUMN;
Table.SELECTION_ALL = TableBase.SELECTION_ALL;
Table.SELECTION_COLUMN = TableBase.SELECTION_COLUMN;
Table.SELECTION_INVERT = TableBase.SELECTION_INVERT;
Table.SELECTION_NONE = TableBase.SELECTION_NONE;

Table.Column = TableBase.Column;
Table.ColumnGroup = TableBase.ColumnGroup;
Table.Summary = TableBase.Summary;
