import { Table } from "@nextgisweb/gui/antd";
import type { TableColumnsType } from "@nextgisweb/gui/antd";
import { ExpandableText } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FieldDataItem } from "./fields";

import "./KeyValueTable.less";

export function KeyValueTable({ data }: { data: FieldDataItem[] }) {
    const columns: TableColumnsType<FieldDataItem> = [
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

    const dataSource: FieldDataItem[] = data.map(({ key, value, attr }) => ({
        key,
        value:
            typeof value === "string" ? <ExpandableText text={value} /> : value,
        attr: attr ?? (key ? String(key) : undefined),
    }));

    return (
        <Table
            className="ngw-webmap-panel-identify-kv-table"
            dataSource={dataSource}
            columns={columns}
            bordered={true}
            size="small"
            showHeader={false}
        />
    );
}
