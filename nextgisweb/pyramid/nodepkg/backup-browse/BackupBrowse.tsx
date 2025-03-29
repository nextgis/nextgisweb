import { utc } from "dayjs";
import { useMemo } from "react";

import { Table } from "@nextgisweb/gui/antd";
import { formatSize } from "@nextgisweb/gui/util";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./BackupBrowse.less";

interface BackupBrowseProps {
    items: {
        filename: string;
        tstamp: string;
        size: number;
    }[];
}

export function BackupBrowse({ items }: BackupBrowseProps) {
    const columns = useMemo(
        () => [
            {
                title: gettext("Filename"),
                className: "filename",
                dataIndex: "filename",
                render: (value: string) => (
                    <a
                        href={routeURL(
                            "pyramid.control_panel.backup.download",
                            { filename: value }
                        )}
                    >
                        {value}
                    </a>
                ),
            },
            {
                title: gettext("Timestamp (UTC)"),
                className: "timestamp",
                dataIndex: "timestamp",
                render: (value: string) => utc(value).format("L LTS"),
            },
            {
                title: gettext("Size"),
                className: "size",
                dataIndex: "size",
                render: (value: number) => formatSize(value),
            },
        ],
        []
    );

    return (
        <Table
            className={"ngw-pyramid-backup-page"}
            size="middle"
            card={true}
            style={{ width: "100%" }}
            dataSource={items}
            columns={columns}
            rowKey="filename"
        />
    );
}
