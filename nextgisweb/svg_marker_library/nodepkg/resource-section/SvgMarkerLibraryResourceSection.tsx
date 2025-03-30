import { useMemo } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableColumnProps } from "@nextgisweb/gui/antd";
import { assert } from "@nextgisweb/jsrealm/error";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceSection } from "@nextgisweb/resource/resource-section";

export const SvgMarkerLibraryResourceSection: ResourceSection = ({
    resourceData,
}) => {
    const files = resourceData.svg_marker_library?.files;
    assert(files);

    type Record = (typeof files)[number];

    const columns = useMemo<TableColumnProps<Record>[]>(() => {
        return [
            {
                key: "idx",
                title: false,
                width: "5%",
                render: (value, record, index) => index + 1,
            },
            {
                key: "name",
                title: gettext("Name"),
                dataIndex: "name",
                width: "95%",
                render: (value: string) => (
                    <a
                        href={routeURL("resource.file_download", {
                            id: resourceData.resource.id,
                            name: value,
                        })}
                        target="_blank"
                    >
                        {value}
                    </a>
                ),
            },
        ];
    }, [resourceData]);

    return (
        <Table
            size="middle"
            card={true}
            columns={columns}
            dataSource={files}
            rowKey="name"
        />
    );
};

SvgMarkerLibraryResourceSection.displayName = "SvgMarkerLibraryResourceSection";
SvgMarkerLibraryResourceSection.title = gettext("SVG marker library");
