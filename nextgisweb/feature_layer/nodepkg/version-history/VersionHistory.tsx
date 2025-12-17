import type { TableProps as AntTableProps } from "antd/es/table";
import type { Dayjs } from "dayjs";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type {
    VersionCGetGroup,
    VersionCGetVersion,
} from "@nextgisweb/feature-layer/type/api";
import { RangePicker, Table } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import type { RouteQuery } from "@nextgisweb/pyramid/api/type";
import { useRoute, useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext, pgettext } from "@nextgisweb/pyramid/i18n";
import { PageTitle } from "@nextgisweb/pyramid/layout";

import { HistoryGroupDetails } from "./VersionHistoryGroupDetails";

import { LoadingOutlined } from "@ant-design/icons";

import "./VersionHistory.less";

const BLOCK_SIZE = 30;

type VersionItem = VersionCGetVersion | VersionCGetGroup;

function getRowKey(row: VersionItem): string {
    return row.type === "group" ? row.id.join("-") : String(row.id);
}

function format_tstamp(tstamp: string) {
    return utc(tstamp).local().format("L LTS");
}
function formatTstamp(v: VersionItem): string {
    return v.type === "group"
        ? format_tstamp(v.tstamp[1])
        : format_tstamp(v.tstamp);
}

function dayjsToApi(v: Dayjs) {
    return v.local().millisecond(0).toISOString().replace(/Z$/, "");
}

function UserCell({ userId }: { userId: number }) {
    const { data, isLoading } = useRouteGet(
        "auth.user.item",
        {
            id: userId,
        },
        { cache: true }
    );
    if (isLoading) {
        return "...";
    }
    return data ? data.display_name : `#${userId}`;
}

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

export function VersionHistory({ id }: { id: number }) {
    const { data: res, isLoading: isItemLoading } = useRouteGet(
        "resource.item",
        { id }
    );
    const {
        route: versionRoute,
        isLoading: isVersionLoading,
        abort,
    } = useRoute("feature_layer.version.collection", { id });

    const epoch = useMemo(() => {
        return res?.feature_layer?.versioning?.epoch;
    }, [res]);

    const [tstampGe, setTstampGe] = useState<string | null>(null);
    const [tstampLt, setTstampLt] = useState<string | null>(null);

    const [groups, setGroups] = useState<VersionItem[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    const [tableHeight, setTableHeight] = useState<number>(0);
    const [scrollY, setScrollY] = useState(0);

    const tableWrapRef = useRef<HTMLDivElement | null>(null);

    const cursorRef = useRef(cursor);
    const loadingRef = useRef(false);

    useEffect(() => {
        cursorRef.current = cursor;
    }, [cursor]);
    useEffect(() => {
        loadingRef.current = isVersionLoading;
    }, [isVersionLoading]);

    useEffect(() => {
        setGroups([]);
        setCursor(null);
        setHasMore(true);
    }, [epoch, tstampGe, tstampLt]);

    const loadBlock = useCallback(async () => {
        if (!epoch) return;
        if (!hasMore) return;
        if (loadingRef.current) return;

        try {
            const query: RouteQuery<"feature_layer.version.collection", "get"> =
                {
                    epoch,
                    order: "desc",
                    group: true,
                    limit: BLOCK_SIZE,
                    cursor: cursorRef.current ?? undefined,
                };

            if (tstampGe) query.tstamp_ge = tstampGe;
            if (tstampLt) query.tstamp_lt = tstampLt;

            const resp = await versionRoute.get({
                query,
                cache: true,
            });
            const next = resp?.items ?? [];
            setGroups((cur) => cur.concat(next));

            const nextCursor = resp?.cursor;
            setCursor(nextCursor);

            if (!nextCursor || next.length < BLOCK_SIZE) {
                setHasMore(false);
            }
            loadingRef.current = false;
        } finally {
            // ignore
        }
    }, [epoch, hasMore, tstampGe, tstampLt, versionRoute]);

    useEffect(() => {
        loadBlock();

        return abort;
    }, [loadBlock, abort]);

    useEffect(() => {
        const element = tableWrapRef.current;
        if (!element) return;

        const observer = new ResizeObserver(([entry]) => {
            setTableHeight(entry.contentRect.height);
        });

        setTableHeight(element.getBoundingClientRect().height);

        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    useLayoutEffect(() => {
        const element = tableWrapRef.current;
        if (!element) return;

        const header = element.querySelector(".ant-table-header");

        const headerHeight = header?.getBoundingClientRect().height ?? 0;

        setScrollY(tableHeight - headerHeight);
    }, [tableHeight, isItemLoading]);

    return (
        <div
            style={{
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <PageTitle>
                <div style={{ display: "flex", flexGrow: 1, gap: "8px" }}>
                    <RangePicker
                        allowEmpty={[true, true]}
                        showTime
                        onChange={(dates) => {
                            const [ge, lt] = dates ? dates : [null, null];
                            setTstampLt(lt ? dayjsToApi(lt) : null);
                            setTstampGe(ge ? dayjsToApi(ge) : null);
                        }}
                    />
                </div>
            </PageTitle>

            <div
                ref={tableWrapRef}
                style={{
                    flex: "1 1 0",
                    height: "100%",
                    display: "flex",
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <Table
                    className="ngw-feature-layer-version-history"
                    virtual
                    scroll={{ y: scrollY }}
                    onScroll={(e) => {
                        const el = e.currentTarget;

                        const distance =
                            el.scrollHeight - (el.scrollTop + el.clientHeight);
                        if (distance <= 1) {
                            loadBlock();
                        }
                    }}
                    bordered
                    rowKey={getRowKey}
                    columns={columns}
                    dataSource={groups}
                    pagination={false}
                    size="small"
                    loading={{
                        spinning: isItemLoading || isVersionLoading,
                        indicator: <LoadingOutlined />,
                    }}
                    expandable={{
                        columnWidth: 32,
                        expandedRowKeys,
                        onExpandedRowsChange: (keys) => {
                            setExpandedRowKeys([...keys]);
                        },
                        expandedRowRender: (row) => (
                            <HistoryGroupDetails
                                resourceId={id}
                                epoch={epoch ?? 0}
                                group={row}
                            />
                        ),
                    }}
                />
            </div>
        </div>
    );
}
