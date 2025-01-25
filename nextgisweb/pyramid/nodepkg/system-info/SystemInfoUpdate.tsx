import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import { TemplateLink } from "@nextgisweb/gui/component";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";
import { url } from "@nextgisweb/pyramid/nextgis";
import settings from "@nextgisweb/pyramid/settings!pyramid";
import { updateStore } from "@nextgisweb/pyramid/update";

import "./SystemInfoUpdate.less";

const msgChecking = gettext("Checking for updates...");
const msgContactSupport = gettext("<a>Contact support</a> for update.");
const msgShowDetails = gettext("Show details");

// prettier-ignore
const [msgCritical, msgHasUpdate, msgUpToDate] = [
    gettextf("Critical updates are available: {version}. Please consider updating an soon as possible."),
    gettextf("New version of {distribution} is available: {version}."),
    gettextf("Your {distribution} is up-to-date."),
]

const { distribution } = ngwConfig;

export const SystemInfoUpdate = observer(() => {
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [showDetails, hideDetails] = useMemo(() => {
        return [() => setDetailsVisible(true), () => setDetailsVisible(false)];
    }, []);

    useEffect(() => {
        updateStore.force();
    }, []);

    const [status, data] = updateStore.state;
    if (status === "disabled") return <></>;

    if (!distribution) throw new Error("Undefined distribution");

    let cn, msg, extra, btn;
    if (status === "loading") {
        msg = msgChecking;
    } else if (status === "up_to_date") {
        msg = msgUpToDate({ distribution: distribution.description! });
    } else if (status === "has_update") {
        cn = classNames("update", { "critical": data.critical });
        msg = (data.critical ? msgCritical : msgHasUpdate)({
            distribution: distribution.description!,
            version: data.version,
        });

        if (settings.support_url) {
            extra = (
                <TemplateLink
                    template={msgContactSupport}
                    link={url(settings.support_url)}
                    target="_blank"
                />
            );
        }

        btn = (
            <>
                <Button type="primary" ghost onClick={showDetails}>
                    {msgShowDetails}
                </Button>
                <Modal
                    wrapClassName="ngw-pyramid-update-sysinfo-modal"
                    open={detailsVisible}
                    onCancel={hideDetails}
                    title={distribution.description!}
                    centered={true}
                    footer={false}
                    width="60em"
                >
                    <iframe src={data.notesUrl} />
                </Modal>
            </>
        );
    }

    return (
        <div className={classNames("ngw-pyramid-system-info-update", cn)}>
            <div className="msg">
                {msg}
                {extra && <div>{extra}</div>}
            </div>
            {btn}
        </div>
    );
});

SystemInfoUpdate.displayName = "SystemInfoUpdate";
