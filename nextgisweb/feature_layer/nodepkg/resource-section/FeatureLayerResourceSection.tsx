import { useMemo } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableColumnProps } from "@nextgisweb/gui/antd";
import { assert } from "@nextgisweb/jsrealm/error";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceSection } from "@nextgisweb/resource/resource-section";

export const FeatureLayerResourceSection: ResourceSection = ({
    resourceData,
}) => {
    const fields = resourceData.feature_layer?.fields;
    assert(fields);

    const columns = useMemo<TableColumnProps[]>(() => {
        return [
            {
                key: "keyname",
                title: gettext("Keyname"),
                dataIndex: "keyname",
                width: "25%",
            },
            {
                key: "datatype",
                title: gettext("Type"),
                dataIndex: "datatype",
                width: "15%",
            },
            {
                key: "display_name",
                title: gettext("Display name"),
                dataIndex: "display_name",
                width: "60%",
            },
        ];
    }, []);

    return (
        <Table
            style={{ width: "100%" }}
            size="middle"
            card={true}
            columns={columns}
            dataSource={fields}
            rowKey="keyname"
        />
    );
};

FeatureLayerResourceSection.displayName = "FeatureLayerResourceSection";
FeatureLayerResourceSection.title = gettext("Fields");
