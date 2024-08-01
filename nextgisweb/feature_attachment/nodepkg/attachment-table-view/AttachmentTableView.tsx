import { gettext } from "@nextgisweb/pyramid/i18n";
import type { IdentifyExtensionComponentProps } from "@nextgisweb/webmap/panel/identification/identification";

import AttachmentTable from "../attachment-table";
import type { FeatureAttachment } from "../type";

import AttachFileIcon from "@nextgisweb/icon/material/attach_file/fill";

import "@nextgisweb/webmap/panel/identification/PanelContentContainer.less";

export default function AttachmentTableView({
    featureItem,
    resourceId,
}: IdentifyExtensionComponentProps) {
    if (!featureItem.extensions || !featureItem.extensions["attachment"]) {
        return null;
    }

    const attachments = featureItem.extensions[
        "attachment"
    ] as FeatureAttachment[];

    return (
        <>
            <div className="panel-content-container">
                <div className="fill">
                    <h3>
                        <AttachFileIcon /> {gettext("Attachments")}
                    </h3>
                </div>
            </div>
            <div className="panel-content-container">
                <div className="fill">
                    <AttachmentTable
                        attachments={attachments}
                        featureId={featureItem.id}
                        resourceId={resourceId}
                        isSmall
                    />
                </div>
            </div>
        </>
    );
}
