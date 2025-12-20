import type { TableProps as AntTableProps } from "antd/es/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { RouteResp } from "@nextgisweb/pyramid/api/type";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";

import { LoadingOutlined } from "@ant-design/icons";

type Group = { id: number | [number, number] };

type ChangesFetchResp = RouteResp<"feature_layer.changes_fetch", "get">;

type ChangesFetchItem = ChangesFetchResp[number];

type Row = {
    key: string;
    fid: number;
    item: ChangesFetchItem;
};

let ATTACHMENT_ID = 0;

function getGroupMinMax(group: Group): { min: number; max: number } {
    if (Array.isArray(group.id)) return { min: group.id[0], max: group.id[1] };
    return { min: group.id, max: group.id };
}

function actionLabel(action: string): string {
    switch (action) {
        case "feature.create":
            return gettext("Created");
        case "feature.update":
            return gettext("Updated");
        case "feature.delete":
            return gettext("Deleted");
        case "feature.restore":
            return gettext("Restored");
        default:
            return action;
    }
}

function parseCursorFromUrl(u: string): string | null {
    try {
        const url = new URL(u, window.location.origin);
        return url.searchParams.get("cursor");
    } catch {
        return null;
    }
}

function pickContinueCursor(items: ChangesFetchResp): string | null {
    const cont = items.find((it) => it.action === "continue");
    return cont?.url ? parseCursorFromUrl(cont.url) : null;
}

function toRows(items: ChangesFetchResp): Row[] {
    const out: Row[] = [];
    for (const item of items) {
        const action = item.action;
        if (!action || action === "continue") continue;

        // @ts-expect-error fid is not typing for "feature.create" but exist
        const fid = item.fid;
        let key: string;

        if (action === "attachment.create") {
            key = String(ATTACHMENT_ID++);
        } else {
            // @ts-expect-error vid is not typing
            const vid = item.vid;

            key = `${fid}-${action}-${vid}`;
        }

        out.push({
            key,
            fid,
            item,
        });
    }
    return out;
}

function ActionCell({ row }: { row: Row }) {
    const it = row.item;

    if (it.action === "feature.update") {
        const parts: string[] = [];

        const hasGeom = !!it.geom;
        const fieldCount = it.fields?.length ?? 0;

        if (hasGeom) {
            parts.push(gettext("Updated geometry"));
        }

        if (fieldCount > 0) {
            const withVerb = ngettextf(
                "Updated {} attribute",
                "Updated {} attributes",
                fieldCount
            )(fieldCount);

            const withoutVerb = ngettextf(
                "{} attribute",
                "{} attributes",
                fieldCount
            )(fieldCount);

            parts.push(hasGeom ? withoutVerb : withVerb);
        }

        if (parts.length) {
            return parts.join(" " + gettext("and") + " ");
        }
    }

    return actionLabel(it.action);
}

const columns: AntTableProps<Row>["columns"] = [
    {
        title: gettext("Feature"),
        key: "feature",
        width: 250,
        render: (_, row) => `${gettext("Feature")} #${row.fid}`,
    },
    {
        title: gettext("Action"),
        key: "action",
        render: (_, row) => <ActionCell row={row} />,
    },
];

export function HistoryGroupDetails(props: {
    resourceId: number;
    epoch: number;
    group: Group;
}) {
    const { resourceId, epoch, group } = props;

    const { min, max } = useMemo(() => getGroupMinMax(group), [group]);
    const initial = useMemo(() => Math.max(0, min - 1), [min]);
    const target = useMemo(() => max, [max]);

    const {
        route: checkRoute,
        isLoading: checkIsLoading,
        abort: checkAbort,
    } = useRoute("feature_layer.changes_check", { id: resourceId });

    const {
        route: fetchRoute,
        isLoading: fetchIsLoading,
        abort: fetchAbort,
    } = useRoute("feature_layer.changes_fetch", { id: resourceId });

    const abort = useCallback(() => {
        fetchAbort();
        checkAbort();
    }, [fetchAbort, checkAbort]);

    const refParent = useRef<HTMLDivElement | null>(null);

    const [rows, setRows] = useState<Row[]>([]);

    const [cursor, setCursor] = useState<string | null>(null);

    const cursorRef = useRef<string | null>(null);

    useEffect(() => {
        cursorRef.current = cursor;
    }, [cursor]);

    useEffect(() => {
        setRows([]);
        setCursor(null);
    }, [epoch, resourceId, initial, target]);

    const ensureCursor = useCallback(async (): Promise<string | null> => {
        if (!epoch) return null;

        const resp = await checkRoute.get({
            query: { epoch, initial, target },
            cache: true,
        });

        const fetchUrl = resp?.fetch;
        if (!fetchUrl) return null;

        return parseCursorFromUrl(fetchUrl);
    }, [checkRoute, epoch, initial, target]);

    const loadBlock = useCallback(async () => {
        if (typeof epoch !== "number") return;

        try {
            const cur = cursorRef.current ?? (await ensureCursor());
            if (!cur) {
                setCursor(null);
                return;
            }

            const resp = await fetchRoute.get({
                query: { epoch, initial, target, cursor: cur },
                cache: true,
            });

            const batch = toRows(resp);
            if (batch.length) {
                setRows((prev) => {
                    const offset = prev.length;
                    return prev.concat(
                        batch.map((r, i) => ({
                            ...r,
                            key: `${r.fid}-${r.item.action}-${offset + i}`,
                        }))
                    );
                });
            }

            const next = pickContinueCursor(resp);
            setCursor(next);
        } catch {
            setCursor(null);
        }
    }, [epoch, target, fetchRoute, initial, ensureCursor]);

    useEffect(() => {
        loadBlock();
        return abort;
    }, [loadBlock, abort]);

    return (
        <div ref={refParent}>
            <Table
                rowKey="key"
                virtual
                scroll={{ y: 400 }}
                onScroll={(e) => {
                    const el = e.currentTarget;

                    const distance =
                        el.scrollHeight - (el.scrollTop + el.clientHeight);
                    if (distance <= 50) {
                        loadBlock();
                    }
                }}
                loading={{
                    spinning: fetchIsLoading || checkIsLoading,
                    indicator: <LoadingOutlined />,
                }}
                columns={columns}
                dataSource={rows}
                pagination={false}
                size="small"
                showHeader={false}
            />
        </div>
    );
}
