import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { Button } from "@nextgisweb/gui/antd";
import DatePicker from "@nextgisweb/gui/antd/date-picker";
import dayjs, { utc } from "@nextgisweb/gui/dayjs";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext, ngettext } from "@nextgisweb/pyramid/i18n";
import { PageTitle } from "@nextgisweb/pyramid/layout";

import "./Journal.less";

const { RangePicker } = DatePicker;

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

const fld = (rec, name) => rec[FIELD_INDEX[name]];

const COLUMNS = [
    {
        title: gettext("Request"),
        className: "c-request",
        render: ({ field }) => {
            const scode = field("response.status_code");
            const sclass = `status status-${Math.floor(scode / 100)}xx`;
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
        render: ({ field }) => <>{field("request.remote_addr")}</>,
    },
    {
        title: gettext("User"),
        render: ({ field }) => <>{field("user.display_name")}</>,
    },
    {
        title: gettext("Route name"),
        render: ({ field }) => <>{field("response.route_name")}</>,
    },
    {
        title: gettext("Context"),
        render: ({ field }) => {
            const model = field("context.model");
            const id = field("context.id");
            if (!model) return <></>;
            return <>{model + (id !== null ? `:${id}` : "")}</>;
        },
    },
];

function format_tstamp(v) {
    const [s, m] = v.split(".");
    return utc(s).local().format("YYYY-MM-DD HH:mm:ss") + "." + m;
}

function Detail({ data }) {
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

function Record({ tstamp, fields }) {
    const [expanded, setExpanded] = useState(false);
    const [detail, setDetail] = useState(false);

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
                        <Render field={(name) => fld(fields, name)} />
                    </td>
                ))}
            </tr>
            {expanded && <Detail data={detail} />}
        </>
    );
}

function Block({ rows }) {
    return (
        <tbody>
            {rows.map(([tstamp, ...fields], idx) => (
                <Record key={idx} {...{ tstamp, fields }} />
            ))}
        </tbody>
    );
}

function dayjsToApi(v) {
    return v.local().millisecond(0).toISOString().replace(/Z$/, "");
}

function rangePresetLast(n, unit) {
    let label;
    if (unit === "minute") {
        label = ngettext("Last {} minute", "Last {} minutes", n);
    } else if (unit === "hour") {
        label = ngettext("Last {} hour", "Last {} hours", n);
    } else if (unit === "day") {
        label = ngettext("Last {} day", "Last {} days", n);
    }
    label = label.replace("{}", n);
    return {
        label: label,
        value: () => [dayjs().subtract(n, unit), null],
    };
}

export function Journal() {
    const [params, setParams] = useState(() => ({
        ge: null,
        lt: null,
        user: undefined,
    }));

    const [blocks, setBlocks] = useState([]);
    const [pointer, setPointer] = useState(null);

    const refLoading = useRef();
    const refParent = useRef(null);
    const refTable = useRef(null);

    const loadBlock = useCallback(() => {
        if (pointer === false || refLoading.current) return;

        const gt = pointer;
        const { ge, lt, user } = params;

        const query = { format: "array", fields: FIELDS, limit: BLOCK_SIZE };
        if (gt) query.gt = gt;
        if (ge) query.ge = ge;
        if (lt) query.lt = lt;
        if (user) query.filter = JSON.stringify({ "user.id": user });

        const promise = (refLoading.current = route("audit.dbase").get({
            query: query,
        }));

        promise.then((data) => {
            setBlocks((cur) => [...cur, data]);
            if (data === null || !setPointer) return;
            setPointer(
                data.length === BLOCK_SIZE ? data.slice(-1)[0][0] : false
            );
            refLoading.current = undefined;
        });
    }, [params, setBlocks, pointer, setPointer]);

    const exportCsv = () => {
        const query = { format: "csv", fields: FIELDS_CSV };
        const { ge, lt, user } = params;

        if (ge) query.ge = ge;
        if (lt) query.lt = lt;
        if (user) query.filter = JSON.stringify({ "user.id": user });

        window.open(
            `${routeURL("audit.dbase")}?${new URLSearchParams(
                Object.entries(query)
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
            el.scrollTop + el.clientHeight > el.scrollHeight - 100
        ) {
            loadBlock(pointer);
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
                            {blocks.map((rows, idx) => (
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
