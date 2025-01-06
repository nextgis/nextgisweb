import type { ColumnsType } from "antd/es/table";

import { Table } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FieldDataItem } from "./fields";

export function KeyValueTable({ data }: { data: FieldDataItem[] }) {
    const columns: ColumnsType<FieldDataItem> = [
        {
            title: gettext("Attribute"),
            dataIndex: "attr",
            key: "attr",
            className: "attr-column",
        },
        {
            title: gettext("Value"),
            dataIndex: "value",
            key: "value",
        },
    ];

    return (
        <Table
            size="small"
            className="key-value-table"
            dataSource={data.map(({ key, value, attr }) => ({
                key,
                value,
                attr: attr ?? (key ? String(key) : undefined),
            }))}
            columns={columns}
            showHeader={false}
        />
    );
}
