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
import type { Key } from "react";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { Button, RangePicker } from "@nextgisweb/gui/antd";
import dayjs, { utc } from "@nextgisweb/gui/dayjs";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";
import { PageTitle } from "@nextgisweb/pyramid/layout";
import type Routes from "@nextgisweb/pyramid/type/route";

import "./Journal.less";

type AuditDbaseQuery = Routes["audit.dbase"]["get"]["query"];
type AuditDbaseQueryGetResponse = Routes["audit.dbase"]["get"]["response"]; // any but we know it is array of primitives

type AuditDbaseQueryGetResponseLogEntry = any[]; // change when API will be better typed

type LogEntryObject = {
    request: {
        path: string;
        method: string;
        remote_addr: string;
    };
    response: {
        route_name: string;
        status_code: number;
    };
    user?: {
        id: number;
        keyname: string;
        display_name: string;
    };
};

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

const fld = (rec: AuditDbaseQueryGetResponseLogEntry, name: string): string =>
    rec[FIELD_INDEX[name]];

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

function Detail({ data }: { data: LogEntryObject | boolean }) {
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

function Record({ tstamp, fields }: { tstamp: string; fields: typeof FIELDS }) {
    const [expanded, setExpanded] = useState(false);
    const [detail, setDetail] = useState<LogEntryObject | boolean>(false);

    const toggle = useCallback(() => {
        setExpanded(!expanded);
        if (detail === false) {
            route("audit.dbase")
                .get({ query: { eq: tstamp, format: "object" } })
                .then((data) => setDetail(data[0]));
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

function Block({ rows }: { rows: AuditDbaseQueryGetResponseLogEntry[] }) {
    return (
        <tbody>
            {rows.map(([tstamp, ...fields], idx: Key | null | undefined) => (
                <Record key={idx} {...{ tstamp, fields }} />
            ))}
        </tbody>
    );
}

function dayjsToApi(v: Dayjs) {
    return v.local().millisecond(0).toISOString().replace(/Z$/, "");
}

const rangePresetLast = (
    n: number,
    unit: "minute" | "hour" | "day"
    // should be DateType instead of any, but it also weird in source
): ValueDate<Exclude<RangeValueType<any>, null>> => {
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

type AuditDbaseQueryWithUser = Omit<AuditDbaseQuery, "format"> & {
    user?: string | number;
};

type UrlSearchParamsArgs =
    | string[][]
    | Record<string, string>
    | string
    | URLSearchParams;

export function Journal() {
    const [params, setParams] = useState<AuditDbaseQueryWithUser>(() => ({
        ge: undefined,
        lt: undefined,
        user: undefined,
    }));

    const [blocks, setBlocks] = useState<AuditDbaseQueryGetResponse>([]);
    const [pointer, setPointer] = useState(null);

    const refLoading = useRef<AuditDbaseQueryGetResponse>();
    const refParent = useRef<HTMLDivElement | null>(null);
    const refTable = useRef<HTMLTableElement | null>(null);

    const loadBlock = useCallback(() => {
        if (pointer === false || refLoading.current) return;

        const gt = pointer;
        const { ge, lt, user } = params;

        const query: AuditDbaseQuery = {
            format: "array",
            fields: FIELDS,
            limit: BLOCK_SIZE,
        };
        if (gt) query.gt = gt;
        if (ge) query.ge = ge;
        if (lt) query.lt = lt;
        if (user) query.filter = JSON.stringify({ "user.id": user });

        const promise = (refLoading.current = route("audit.dbase").get({
            query: query,
        }));

        promise.then((data: AuditDbaseQueryGetResponse) => {
            setBlocks((cur: any) => [...cur, data]);
            if (data === null || !setPointer) return;
            setPointer(
                data.length === BLOCK_SIZE ? data.slice(-1)[0][0] : false
            );
            refLoading.current = undefined;
        });
    }, [params, setBlocks, pointer, setPointer]);

    const exportCsv = () => {
        const query: AuditDbaseQuery = { format: "csv", fields: FIELDS_CSV };
        const { ge, lt, user } = params;

        if (ge) query.ge = ge;
        if (lt) query.lt = lt;
        if (user) query.filter = JSON.stringify({ "user.id": user });

        window.open(
            `${routeURL("audit.dbase")}?${new URLSearchParams(
                Object.entries(query) as UrlSearchParamsArgs // TODO double check
            )}`
        );
    };

    useEffect(() => {
        setBlocks([]);
        setPointer(null);
        refLoading.current = undefined;
    }, [params]);

    const onScroll = useCallback(() => {
        if (pointer === false) return;
        const el = refParent.current;
        if (
            pointer === null ||
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
        "font-weight-strong": "fontWeightStrong",
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
                            {blocks.map(
                                (
                                    rows: AuditDbaseQueryGetResponseLogEntry[],
                                    idx: number
                                ) => (
                                    <Block key={idx} rows={rows} />
                                )
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

Journal.targetElementId = "main";
Journal.displayName = "Journal";