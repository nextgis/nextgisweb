import type { Dayjs } from "dayjs";
import type { RangeValueType } from "rc-picker/lib/PickerInput/RangePicker";
import type { ValueDate } from "rc-picker/lib/interface";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import type {
    AuditArrayLogEntry,
    AuditObject,
} from "@nextgisweb/audit/type/api";
import { PrincipalSelect } from "@nextgisweb/auth/component";
import { Button, RangePicker } from "@nextgisweb/gui/antd";
import dayjs, { utc } from "@nextgisweb/gui/dayjs";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { encodeQueryParams, route, routeURL } from "@nextgisweb/pyramid/api";
import type { RouteQuery, RouteResp } from "@nextgisweb/pyramid/api/type";
import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";
import { PageTitle } from "@nextgisweb/pyramid/layout";

import "./Journal.less";

type AuditDbaseQuery = RouteQuery<"audit.dbase", "get">;
type AuditDbaseQueryGetResponse = RouteResp<"audit.dbase", "get">;

type AuditFields = AuditArrayLogEntry[1];

type RenderArg = { field: (name: string) => string };

const BLOCK_SIZE = 100;

const FIELDS = [
    "request.method",
    "request.path",
    "request.remote_addr",
    "response.status_code",
    "response.route_name",
    "user.display_name",
    "context.model",
    "context.id",
].sort();

const FIELDS_CSV = FIELDS.concat([
    "request.query_string",
    "user.id",
    "user.keyname",
]).sort();

const FIELD_INDEX = Object.fromEntries(FIELDS.map((f, i) => [f, i]));

const fld = (rec: AuditFields, name: string): string => {
    const val = rec[FIELD_INDEX[name]];
    return val ? String(val) : "";
};

export function isAuditArrayLogEntry(
    response: AuditDbaseQueryGetResponse
): response is AuditArrayLogEntry[] {
    if (!Array.isArray(response)) {
        return false;
    }

    return response.every((entry) => Array.isArray(entry));
}

const COLUMNS = [
    {
        title: gettext("Request"),
        className: "c-request",
        render: ({ field }: RenderArg) => {
            const scode = field("response.status_code");
            const sclass = `status status-${Math.floor(Number(scode) / 100)}xx`;
            const method = field("request.method");
            const path = field("request.path");
            return (
                <>
                    <span className={sclass}>{scode}</span>
                    <span className="method">{method}</span>
                    <span className="path">{path}</span>
                </>
            );
        },
    },
    {
        title: gettext("IP address"),
        render: ({ field }: RenderArg) => <>{field("request.remote_addr")}</>,
    },
    {
        title: gettext("User"),
        render: ({ field }: RenderArg) => <>{field("user.display_name")}</>,
    },
    {
        title: gettext("Route name"),
        render: ({ field }: RenderArg) => <>{field("response.route_name")}</>,
    },
    {
        title: gettext("Context"),
        render: ({ field }: RenderArg) => {
            const model = field("context.model");
            const id = field("context.id");
            if (!model) return <></>;
            return <>{model + (id !== null ? `:${id}` : "")}</>;
        },
    },
];

function format_tstamp(v: string) {
    const [s, m] = v.split(".");
    return utc(s).local().format("YYYY-MM-DD HH:mm:ss") + "." + m;
}

function Detail({ data }: { data: AuditObject | boolean }) {
    const entries = Object.entries(data).filter(([k]) => k !== "@timestamp");
    return (
        <>
            {entries.map(([k, v], idx) => {
                const last = idx === entries.length - 1;
                return (
                    <tr key={k} className={"detail" + (last ? " last" : "")}>
                        <td className="c-detail-key">{k}</td>
                        <td className="c-detail-val" colSpan={COLUMNS.length}>
                            {JSON.stringify(v, null, " ")}
                        </td>
                    </tr>
                );
            })}
        </>
    );
}

function Record({ tstamp, fields }: { tstamp: string; fields: AuditFields }) {
    const [expanded, setExpanded] = useState(false);
    const [detail, setDetail] = useState<AuditObject | boolean>(false);

    const toggle = useCallback(() => {
        setExpanded(!expanded);
        if (detail === false) {
            route("audit.dbase")
                .get({ query: { eq: tstamp, format: "object" } })
                .then((data) => setDetail((data as AuditObject[])[0]));
        }
    }, [tstamp, expanded, setExpanded, detail, setDetail]);

    return (
        <>
            <tr
                className={"summary" + (expanded ? " expanded" : "")}
                onClick={() => toggle()}
            >
                <td className="c-timestamp">{format_tstamp(tstamp)}</td>
                {COLUMNS.map(({ className, render: Render }, idx) => (
                    <td key={idx} className={className}>
                        <Render field={(name: string) => fld(fields, name)} />
                    </td>
                ))}
            </tr>
            {expanded && <Detail data={detail} />}
        </>
    );
}

function Block({ rows }: { rows: AuditArrayLogEntry[] }) {
    return (
        <tbody>
            {rows.map(([tstamp, fields], idx) => {
                return <Record key={idx} tstamp={tstamp} fields={fields} />;
            })}
        </tbody>
    );
}

function dayjsToApi(v: Dayjs) {
    return v.local().millisecond(0).toISOString().replace(/Z$/, "");
}

const rangePresetLast = (
    n: number,
    unit: "minute" | "hour" | "day"
): ValueDate<NonNullable<RangeValueType<Dayjs>>> => {
    let labelf;
    if (unit === "minute") {
        labelf = ngettextf("Last {} minute", "Last {} minutes", n);
    } else if (unit === "hour") {
        labelf = ngettextf("Last {} hour", "Last {} hours", n);
    } else if (unit === "day") {
        labelf = ngettextf("Last {} day", "Last {} days", n);
    }

    return {
        label: labelf ? labelf(n) : "",
        value: () => [dayjs().subtract(n, unit), null],
    };
};

const prepareQuery = (
    params: Partial<AuditDbaseQueryWithUser & AuditDbaseQuery> = {}
): AuditDbaseQuery => {
    const { ge, gt, lt, user, format, ...rest } = params;
    const query: AuditDbaseQuery = {
        ...rest,
        format: format || "array",
    };
    if (gt) query.gt = gt;
    if (ge) query.ge = ge;
    if (lt) query.lt = lt;
    if (user) query.filter = JSON.stringify({ "user.id": user });

    return query;
};

type AuditDbaseQueryWithUser = Omit<AuditDbaseQuery, "format"> & {
    user?: string | number;
};

export function Journal() {
    const [params, setParams] = useState<AuditDbaseQueryWithUser>(() => ({
        ge: undefined,
        lt: undefined,
        user: undefined,
    }));

    const [blocks, setBlocks] = useState<AuditArrayLogEntry[][]>([]);
    const [pointer, setPointer] = useState<string | false>();

    const refLoading = useRef<Promise<AuditDbaseQueryGetResponse>>();
    const refParent = useRef<HTMLDivElement | null>(null);
    const refTable = useRef<HTMLTableElement | null>(null);

    const loadBlock = useCallback(() => {
        if (pointer === false || refLoading.current) return;

        const query = prepareQuery({
            ...params,
            format: "array",
            fields: FIELDS,
            limit: BLOCK_SIZE,
            gt: pointer,
        });

        const promise = route("audit.dbase").get({
            query,
        });
        refLoading.current = promise;

        promise.then((data) => {
            if (isAuditArrayLogEntry(data)) {
                setBlocks((cur) => [...cur, data]);
                if (data === null) return;
                setPointer(
                    data.length === BLOCK_SIZE ? data.slice(-1)[0][0] : false
                );

                refLoading.current = undefined;
            }
        });
    }, [params, pointer]);

    const exportCsv = () => {
        const query = prepareQuery({
            ...params,
            format: "csv",
            fields: FIELDS_CSV,
        });

        window.open(`${routeURL("audit.dbase")}?${encodeQueryParams(query)}`);
    };

    useEffect(() => {
        setBlocks([]);
        setPointer(undefined);
        refLoading.current = undefined;
    }, [params]);

    const onScroll = useCallback(() => {
        if (pointer === false) return;
        const el = refParent.current;
        if (
            pointer === undefined ||
            (el && el.scrollTop + el.clientHeight > el.scrollHeight - 100)
        ) {
            loadBlock();
        }
    }, [loadBlock, pointer]);

    useLayoutEffect(() => {
        onScroll();
    }, [onScroll]);

    const themeVariables = useThemeVariables({
        "color-container": "colorBgContainer",
        "color-alter": "colorFillAlter",
        "color-border": "colorBorderSecondary",
        "border-radius": "borderRadius",
    });

    return (
        <>
            <PageTitle>
                <div className="ngw-audit-journal-page-title">
                    <RangePicker
                        allowEmpty={[true, true]}
                        showTime={{ minuteStep: 5, secondStep: 5 }}
                        onChange={(dates) => {
                            const [ge, lt] = dates ? dates : [null, null];
                            setParams({
                                ...params,
                                ge: ge ? dayjsToApi(ge) : undefined,
                                lt: lt ? dayjsToApi(lt) : undefined,
                            });
                        }}
                        presets={[
                            rangePresetLast(5, "minute"),
                            rangePresetLast(15, "minute"),
                            rangePresetLast(1, "hour"),
                            rangePresetLast(6, "hour"),
                            rangePresetLast(12, "hour"),
                            rangePresetLast(24, "hour"),
                            rangePresetLast(2, "day"),
                            rangePresetLast(7, "day"),
                        ]}
                    />
                    <PrincipalSelect
                        model="user"
                        systemUsers={["guest"]}
                        onChange={(value) => {
                            setParams({
                                ...params,
                                ...(value === null
                                    ? { user: undefined }
                                    : { user: value }),
                            });
                        }}
                        placeholder={gettext("Filter by user")}
                        style={{ minWidth: "25ch" }}
                    />
                    <Button
                        onClick={exportCsv}
                        type="primary"
                        style={{ marginLeft: "auto" }}
                        ghost
                    >
                        {gettext("Export CSV")}
                    </Button>
                </div>
            </PageTitle>
            <div className="ngw-audit-journal" style={themeVariables}>
                <div className="wrapper">
                    <div className="scroll" ref={refParent} onScroll={onScroll}>
                        <table ref={refTable}>
                            <thead>
                                <tr>
                                    <th className="c-timestamp">
                                        {gettext("Timestamp")}
                                    </th>
                                    {COLUMNS.map((col, idx) => (
                                        <th key={idx} className={col.className}>
                                            {col.title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            {blocks.map((rows, idx: number) => (
                                <Block key={idx} rows={rows} />
                            ))}
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

Journal.targetElementId = "main";
Journal.displayName = "Journal";
