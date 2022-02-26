/** @entrypoint */
import { useState, useEffect } from "react";
import { Button, Modal } from "@nextgisweb/gui/antd";
import { registerCallback, notesUrl } from ".";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";
import settings from "@nextgisweb/pyramid/settings!pyramid";
import "./sysinfo.less";

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
                setHasUpdate(st == "has_urgent_update" || st == "has_update");
                setIsCritical(st == "has_urgent_update");
                const latest = data.distribution.latest;
                if (latest) {
                    setLatestVersion(latest.version);
                }
            }
            setLoaded(true);
        });
    }, []);

    const res = !loaded
        ? i18n.gettext("Checking for updates...")
        : /* prettier-ignore */ (hasUpdate
              ? isCritical
                  ? i18n.gettext("Critical updates are available: {version}. Please consider updating an soon as possible.")
                  : i18n.gettext("New version of {distribution} is available: {version}.")
              : i18n.gettext("Your {distribution} is up-to-date.")
          )
              .replace("{distribution}", ngwConfig.distribution.description)
              .replace("{version}", latestVersion);

    const [mUpdPre, mUpdLnk, mUpdPost] = hasUpdate
        ? i18n
              .gettext("<a>Contact support</a> for update.")
              .match(/(.*)<a>(.*)<\/a>(.*)/)
              .slice(1)
        : [null, null, null];

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
                {hasUpdate && (
                    <div>
                        {mUpdPre}
                        <a href={settings.support_url} target="_blank">
                            {mUpdLnk}
                        </a>
                        {mUpdPost}
                    </div>
                )}
            </div>
            {hasUpdate && (
                <div className="btn">
                    <Button type="primary" ghost onClick={showDetails}>
                        {i18n.gettext("Show details")}
                    </Button>
                    <Modal
                        wrapClassName="ngw-pyramid-update-sysinfo-modal"
                        visible={detailsVisible}
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
