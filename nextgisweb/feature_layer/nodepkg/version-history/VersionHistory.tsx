import type { Dayjs } from "dayjs";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react";

import type {
    VersionCGetGroup,
    VersionCGetVersion,
} from "@nextgisweb/feature-layer/type/api";
import { Button, RangePicker, Table } from "@nextgisweb/gui/antd";
import type { RouteQuery } from "@nextgisweb/pyramid/api/type";
import { useRoute, useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { PageTitle } from "@nextgisweb/pyramid/layout";
import { LoaderCache } from "@nextgisweb/pyramid/util";

import { HistoryGroupDetails } from "./component/VersionHistoryGroupDetails";
import { useColumns } from "./hook/useColumns";

import { LoadingOutlined } from "@ant-design/icons";
import RefreshIcon from "@nextgisweb/icon/material/refresh";

import "./VersionHistory.less";

const BLOCK_SIZE = 30;

const cache = new LoaderCache();

type VersionItem = VersionCGetVersion | VersionCGetGroup;

function getRowKey(row: VersionItem): string {
    return row.type === "group" ? row.id.join("-") : String(row.id);
}

function dayjsToApi(v: Dayjs) {
    return v.local().millisecond(0).toISOString().replace(/Z$/, "");
}

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
    const [reloadKey, bumpReloadKey] = useReducer((x: number) => x + 1, 0);

    const [tableHeight, setTableHeight] = useState<number>(0);
    const [scrollY, setScrollY] = useState(0);

    const tableWrapRef = useRef<HTMLDivElement | null>(null);

    const cursorRef = useRef(cursor);
    const loadingRef = useRef(false);

    const columns = useColumns({ epoch, id, bumpReloadKey });

    useEffect(() => {
        cache.clean();
    }, [reloadKey]);

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
    }, [epoch, tstampGe, tstampLt, reloadKey]);

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
                cache,
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
                    <Button
                        type="default"
                        icon={<RefreshIcon />}
                        onClick={bumpReloadKey}
                        title={gettext("Refresh table")}
                    ></Button>
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
