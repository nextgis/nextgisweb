/** @entrypoint */
import { useEffect, useState } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import { TemplateLink } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { url } from "@nextgisweb/pyramid/nextgis";
import settings from "@nextgisweb/pyramid/settings!pyramid";

import { notesUrl, registerCallback } from ".";

import "./sysinfo.less";

const msgChecking = gettext("Checking for updates...");
const msgContactSupport = gettext("<a>Contact support</a> for update.");
const msgShowDetails = gettext("Show details");

// prettier-ignore
const [msgCritical, msgUpdate, msgUpToDate] = [
    gettext("Critical updates are available: {version}. Please consider updating an soon as possible."),
    gettext("New version of {distribution} is available: {version}."),
    gettext("Your {distribution} is up-to-date."),
]

export default function UpdateSysInfo() {
    const [loaded, setLoaded] = useState(false);
    const [hasUpdate, setHasUpdate] = useState(null);
    const [isCritical, setIsCritical] = useState(false);
    const [latestVersion, setLatestVersion] = useState(null);
    const [detailsVisible, setDetailsVisible] = useState(false);

    useEffect(() => {
        registerCallback((data) => {
            const st = data.distribution && data.distribution.status;
            if (st) {
                setHasUpdate(st === "has_urgent_update" || st === "has_update");
                setIsCritical(st === "has_urgent_update");
                const latest = data.distribution.latest;
                if (latest) {
                    setLatestVersion(latest.version);
                }
            }
            setLoaded(true);
        });
    }, []);

    const res = !loaded
        ? msgChecking
        : (hasUpdate ? (isCritical ? msgCritical : msgUpdate) : msgUpToDate)
              .replace("{distribution}", ngwConfig.distribution.description)
              .replace("{version}", latestVersion);

    const showDetails = () => setDetailsVisible(true);
    const hideDetails = () => setDetailsVisible(false);

    return (
        <div
            className={
                "ngw-pyramid-update-sysinfo" +
                (!hasUpdate ? "" : isCritical ? " critical" : " non-critical")
            }
        >
            <div className="msg">
                <div>{res}</div>
                {hasUpdate && settings.support_url && (
                    <div>
                        <TemplateLink
                            template={msgContactSupport}
                            link={url(settings.support_url)}
                            target="_blank"
                        />
                    </div>
                )}
            </div>
            {hasUpdate && (
                <div className="btn">
                    <Button type="primary" ghost onClick={showDetails}>
                        {msgShowDetails}
                    </Button>
                    <Modal
                        wrapClassName="ngw-pyramid-update-sysinfo-modal"
                        open={detailsVisible}
                        title={ngwConfig.distribution.description}
                        footer={false}
                        width="60em"
                        onCancel={hideDetails}
                    >
                        <iframe src={notesUrl()} />
                    </Modal>
                </div>
            )}
        </div>
    );
}
