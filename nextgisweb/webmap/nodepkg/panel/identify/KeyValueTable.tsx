import type { ColumnsType } from "antd/es/table";

import { Table } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FieldDataItem } from "./fields";

import "./KeyValueTable.less";

export function KeyValueTable({ data }: { data: FieldDataItem[] }) {
    const columns: ColumnsType<FieldDataItem> = [
        {
            className: "attr-column",
            title: gettext("Attribute"),
            dataIndex: "attr",
            key: "attr",
        },
        {
            title: gettext("Value"),
            dataIndex: "value",
            key: "value",
        },
    ];

    return (
        <Table
            className="ngw-webmap-panel-identify-kv-table"
            dataSource={data.map(({ key, value, attr }) => ({
                key,
                value,
                attr: attr ?? (key ? String(key) : undefined),
            }))}
            columns={columns}
            bordered={true}
            size="small"
            showHeader={false}
        />
    );
}
