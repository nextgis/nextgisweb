import { Table } from "@nextgisweb/gui/antd";
import type { TableColumnsType } from "@nextgisweb/gui/antd";
import { ExpandableText } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FieldDataItem } from "./fields";

import "./KeyValueTable.less";

export function KeyValueTable({ data }: { data: FieldDataItem[] }) {
  const columns: TableColumnsType<FieldDataItem> = [
    {
      key: "attr",
      dataIndex: "attr",
      className: "attr-column",
      title: gettext("Attribute"),
      render: (value) => (
        <ExpandableText button={false} tooltip={true}>
          {value}
        </ExpandableText>
      ),
    },
    {
      key: "value",
      dataIndex: "value",
      title: gettext("Value"),
    },
  ];

  const dataSource: FieldDataItem[] = data.map(({ key, value, attr }) => ({
    key,
    value:
      typeof value === "string" ? (
        <ExpandableText button={true} tooltip={true}>
          {value}
        </ExpandableText>
      ) : (
        value
      ),
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
