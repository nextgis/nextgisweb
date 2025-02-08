import classNames from "classnames";
import { useEffect, useState } from "react";
import type { CSSProperties, FC } from "react";

import { Skeleton } from "@nextgisweb/gui/antd";
import { errorModal, isAbortError } from "@nextgisweb/gui/error";
import * as icon from "@nextgisweb/gui/icon";
import type {
    CheckBody,
    CheckMessage,
    CheckResponse,
} from "@nextgisweb/postgis/type/api";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./DiagnosticsWidget.less";

type StatusEnum = CheckMessage["status"];

const STEXT = new Map<StatusEnum, string>([
    [null, gettext("Unknown")],
    ["success", gettext("Success")],
    ["warning", gettext("Warning")],
    ["error", gettext("Error")],
]);

const SICON = new Map<StatusEnum, FC>([
    [null, icon.InfoIcon],
    ["success", icon.SuccessIcon],
    ["warning", icon.WarningIcon],
    ["error", icon.ErrorIcon],
]);

const SIcon = ({ status }: { status: StatusEnum }) => {
    const Icon = SICON.get(status || null)!;
    return <Icon />;
};

const statusTexts = Array.from(STEXT.values());
const statusLength = Math.max(...statusTexts.map((v) => v.length));
const statusStyle = { "--status-length": `${statusLength}em` } as CSSProperties;

const Check = ({
    status,
    title,
    messages,
    ...props
}: {
    status: StatusEnum;
    title?: string;
    messages: CheckMessage[];
}) => (
    <div
        className={classNames("check", status || "unknown")}
        style={statusStyle}
        {...props}
    >
        <div className="check-header">
            <div className="check-title">{title}</div>
            <div className="check-status">{STEXT.get(status || null)}</div>
        </div>
        {messages && messages.length > 0 && (
            <ul className="check-messages">
                {messages.map(({ status, text }, idx) => (
                    <li key={idx} className={status || "unknown"} {...props}>
                        <SIcon status={status} />
                        {text}
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export function DiagnosticsWidget({ data }: { data: CheckBody }) {
    type State =
        | ["loading" | "failed", null]
        | [CheckResponse["status"], CheckResponse];

    const [[status, result], setState] = useState<State>(["loading", null]);
    const { abort, makeSignal } = useAbortController();

    useEffect(() => {
        (async () => {
            try {
                const resp = await route("postgis.diagnostics").post({
                    json: data,
                    signal: makeSignal(),
                });
                setState([resp.status, resp]);
            } catch (err) {
                if (!isAbortError(err)) {
                    setState(["failed", null]);
                    errorModal(err);
                }
            }
        })();
        return abort;
    }, [data, abort, makeSignal]);

    return (
        <div className="ngw-postgis-diagnostics-widget">
            {(() => {
                if (status === "loading") {
                    return (
                        <Skeleton
                            title={false}
                            paragraph={{ rows: 4, width: "100%" }}
                        />
                    );
                } else if (result) {
                    return result.checks.map((props, idx) => (
                        <Check key={idx} {...props} />
                    ));
                }
            })()}
        </div>
    );
}
