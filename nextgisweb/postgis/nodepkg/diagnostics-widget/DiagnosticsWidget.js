import { useState, useEffect } from "react";
import CheckCircleIcon from "@material-icons/svg/check_circle";
import WarningIcon from "@material-icons/svg/warning";
import ErrorIcon from "@material-icons/svg/error";
import MessageIcon from "@material-icons/svg/message";
import { Skeleton } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { errorModal } from "@nextgisweb/gui/error";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import "./DiagnosticsWidget.less";

const STEXT = {
    [null]: i18n.gettext("Unknown"),
    success: i18n.gettext("Success"),
    warning: i18n.gettext("Warning"),
    error: i18n.gettext("Error"),
};

const statusLength = Math.max(...Object.values(STEXT).map((v) => v.length));
const statusStyle = { "--status-length": `${statusLength}em` };

const SICON = {
    [null]: MessageIcon,
    success: CheckCircleIcon,
    warning: WarningIcon,
    error: ErrorIcon,
};

const SIcon = ({ status, ...props }) => {
    const Icon = SICON[status || null];
    return <Icon {...props} />;
};

const Check = ({ status, title, messages, ...props }) => (
    <div
        className={"check " + (status || "unknown")}
        style={statusStyle}
        {...props}
    >
        <div className="check-header">
            <div className="check-title">{title}</div>
            <div className="check-status">{STEXT[status || null]}</div>
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

export function DiagnosticsWidget({ data }) {
    const [[status, result], setState] = useState(["loading", null]);

    const doCheck = async () => {
        try {
            setState(["loading", null]);
            const resp = await route("postgis.diagnostics").post({
                json: data,
            });
            setState([resp.status, resp]);
        } catch (err) {
            setState(["failed", null]);
            errorModal(err);
        }
    };

    useEffect(doCheck, []);

    return (
        <div className="ngw-postgis-diagnostics-widget">
            {(() => {
                if (status == "loading") {
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
