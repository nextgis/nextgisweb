import { useMemo } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableColumnProps } from "@nextgisweb/gui/antd";
import { assert } from "@nextgisweb/jsrealm/error";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceSection } from "@nextgisweb/resource/resource-section";

function formatType(v: string | number | boolean | null) {
    if (v === null) {
        return gettext("Empty");
    } else if (typeof v === "string") {
        return gettext("String");
    } else if (typeof v === "number") {
        return gettext("Number");
    } else if (typeof v === "boolean") {
        return gettext("Boolean");
    } else assert(false);
}

function formatValue(v: string | number | boolean | null) {
    if (v === null) {
        return <></>;
    } else if (typeof v === "string") {
        return v;
    } else if (typeof v === "number") {
        return v;
    } else if (typeof v === "boolean") {
        return v ? gettext("True") : gettext("False");
    } else assert(false);
}

export const ResmetaResourceSection: ResourceSection = ({ resourceData }) => {
    const items = resourceData.resmeta?.items;
    assert(items);

    type Record = { key: string; value: string | number | boolean | null };

    const columns = useMemo<TableColumnProps<Record>[]>(() => {
        return [
            {
                key: "key",
                title: gettext("Key"),
                dataIndex: "key",
                width: "25%",
            },
            {
                key: "type",
                title: gettext("Type"),
                dataIndex: "value",
                width: "20%",
                render: (value) => formatType(value),
            },
            {
                key: "value",
                title: gettext("Value"),
                dataIndex: "value",
                width: "60%",
                render: (value) => formatValue(value),
            },
        ];
    }, []);

    const dataSource = useMemo<Record[]>(
        () =>
            Object.entries(items).map(([key, value]) => ({
                key,
                value,
            })),
        [items]
    );

    return (
        <Table
            size="middle"
            card={true}
            columns={columns}
            dataSource={dataSource}
            rowKey="key"
        />
    );
};

ResmetaResourceSection.displayName = "ResmetaResourceSection";
ResmetaResourceSection.title = gettext("Metadata");
