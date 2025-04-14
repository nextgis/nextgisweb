import { useMemo } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableColumnProps } from "@nextgisweb/gui/antd";
import { assert } from "@nextgisweb/jsrealm/error";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceSection } from "@nextgisweb/resource/resource-section";

import { lookupTableLoadItems } from "../util/sort";

export const LookupTableResourceSection: ResourceSection = ({
    resourceData,
}) => {
    const lookupTable = resourceData.lookup_table;
    assert(lookupTable);

    type Record = { key: string; value: string };

    const columns = useMemo<TableColumnProps<Record>[]>(() => {
        return [
            {
                key: "key",
                title: gettext("Key"),
                dataIndex: "key",
                width: "25%",
            },
            {
                key: "value",
                className: "value",
                title: gettext("Value"),
                dataIndex: "value",
                width: "75%",
            },
        ];
    }, []);

    const dataSource = useMemo<Record[]>(
        () => lookupTableLoadItems(lookupTable),
        [lookupTable]
    );

    return (
        <Table
            className={"ngw-lookup-table-resource-section"}
            size="middle"
            card={true}
            columns={columns}
            dataSource={dataSource}
            rowKey="key"
        />
    );
};

LookupTableResourceSection.displayName = "LookupTableResourceSection";
LookupTableResourceSection.title = gettext("Items");
