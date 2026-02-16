import type { TableProps as AntTableProps } from "antd/es/table";
import { max } from "lodash-es";
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

const msgCreated = pgettext("column", "Created");
const msgUpdated = pgettext("column", "Updated");
const msgDeleted = pgettext("column", "Deleted");
const msgRestored = pgettext("column", "Restored");

export type VersionItem = VersionCGetVersion | VersionCGetGroup;

function format_tstamp(tstamp: string) {
    return utc(tstamp).local().format("L LTS");
}

function formatTstamp(v: VersionItem): string {
    return v.type === "group"
        ? format_tstamp(v.tstamp[1])
        : format_tstamp(v.tstamp);
}

const [colCharWidth, colPadding] = [10, 16];
const fcLabels = [msgCreated, msgUpdated, msgDeleted, msgRestored];
const fcWidth = max(fcLabels.map((s) => s.length * colCharWidth + colPadding));

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
                fixed: "start",
                render: (_, row) => formatTstamp(row),
            },
            {
                title: gettext("User"),
                dataIndex: "user",
                key: "user",
                width: 300,
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
                        title: msgCreated,
                        key: "create",
                        width: fcWidth,
                        align: "end",
                        render: (_, row) => row.feature.create,
                    },
                    {
                        title: msgUpdated,
                        key: "update",
                        width: fcWidth,
                        align: "end",
                        render: (_, row) => row.feature.update,
                    },
                    {
                        title: msgDeleted,
                        key: "delete",
                        width: fcWidth,
                        align: "end",
                        render: (_, row) => row.feature.delete,
                    },
                    {
                        title: msgRestored,
                        key: "restore",
                        width: fcWidth,
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
                fixed: "end",
                align: "center",
                render: (_, row) =>
                    epoch && (
                        <VersionHistoryRowMenu
                            item={row}
                            epoch={epoch}
                            versionId={row.id}
                            resourceId={id}
                            bumpReloadKey={bumpReloadKey}
                        />
                    ),
            });
        }

        return columns;
    }, [canRevert, epoch, id, bumpReloadKey]);
};
