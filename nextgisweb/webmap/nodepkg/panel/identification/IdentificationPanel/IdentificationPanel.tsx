import { Alert } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { PanelHeader } from "../../header";
import type { IdentificationPanelProps } from "../identification";

import { IdentifyResult } from "./component/IdentifyResult";
import "./IdentificationPanel.less";

const msgTipTitle = gettext("How does it work");
// prettier-ignore
const msgTipIdent = gettext("To get feature information, click on the map with the left mouse button. Make sure that other tools are turned off.");

export default function IdentificationPanel({
    display,
    identifyInfo,
    title,
    close,
}: IdentificationPanelProps) {
    let info;
    if (!identifyInfo) {
        info = (
            <Alert
                className="alert"
                message={msgTipTitle}
                description={msgTipIdent}
                showIcon={false}
                type="info"
                banner
            />
        );
    }

    return (
        <div className="ngw-panel ngw-webmap-identify-panel">
            <PanelHeader title={title} close={close} />
            {info}
            <IdentifyResult identifyInfo={identifyInfo} display={display} />
        </div>
    );
}
