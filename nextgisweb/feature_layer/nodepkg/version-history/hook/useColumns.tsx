import type { TableProps as AntTableProps } from "antd/es/table";
import { useMemo } from "react";

import type {
    VersionCGetGroup,
    VersionCGetVersion,
} from "@nextgisweb/feature-layer/type/api";
import { utc } from "@nextgisweb/gui/dayjs";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext, pgettext } from "@nextgisweb/pyramid/i18n";

import { UserCell } from "../component/UserCell";
import { VersionHistoryRowMenu } from "../component/VersionHistoryRowMenu";

export type VersionItem = VersionCGetVersion | VersionCGetGroup;

function format_tstamp(tstamp: string) {
    return utc(tstamp).local().format("L LTS");
}
function formatTstamp(v: VersionItem): string {
    return v.type === "group"
        ? format_tstamp(v.tstamp[1])
        : format_tstamp(v.tstamp);
}

export const useColumns = function ({
    id,
    epoch,
    bumpReloadKey,
}: {
    id: number;
    epoch: number | undefined;
    bumpReloadKey: () => void;
}) {
    const { data } = useRouteGet("resource.permission", { id });

    const canRevert = data?.data?.write;

    return useMemo(() => {
        const columns: AntTableProps<VersionItem>["columns"] = [
            {
                title: gettext("Date and time"),
                dataIndex: "tstamp",
                key: "tstamp",
                width: 250,
                render: (_, row) => formatTstamp(row),
            },
            {
                title: gettext("User"),
                dataIndex: "user",
                key: "user",
                render: (_, row) =>
                    typeof row.user?.id === "number" ? (
                        <UserCell userId={row.user?.id} />
                    ) : (
                        ""
                    ),
            },
            {
                title: gettext("Features"),
                children: [
                    {
                        title: pgettext("column", "Created"),
                        key: "create",
                        width: 200,
                        align: "end",
                        render: (_, row) => row.feature.create,
                    },
                    {
                        title: pgettext("column", "Updated"),
                        key: "update",
                        width: 200,
                        align: "end",
                        render: (_, row) => row.feature.update,
                    },
                    {
                        title: pgettext("column", "Deleted"),
                        key: "delete",
                        width: 200,
                        align: "end",
                        render: (_, row) => row.feature.delete,
                    },
                    {
                        title: pgettext("column", "Restored"),
                        key: "restore",
                        width: 200,
                        align: "end",
                        render: (_, row) => row.feature.restore,
                    },
                ],
            },
        ];

        if (canRevert) {
            columns.push({
                title: "",
                key: "actions",
                width: 44,
                fixed: "right",
                align: "center",
                render: (_, row) =>
                    epoch && (
                        <VersionHistoryRowMenu
                            resourceId={id}
                            epoch={epoch}
                            item={row}
                            bumpReloadKey={bumpReloadKey}
                        />
                    ),
            });
        }

        return columns;
    }, [epoch, id, canRevert, bumpReloadKey]);
};
