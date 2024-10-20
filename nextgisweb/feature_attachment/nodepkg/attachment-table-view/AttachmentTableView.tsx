import { gettext } from "@nextgisweb/pyramid/i18n";
import { PanelContentContainer } from "@nextgisweb/webmap/panel/identification/PanelContentContainer";
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
            <PanelContentContainer
                title={
                    <>
                        <AttachFileIcon /> {gettext("Attachments")}
                    </>
                }
            />

            <PanelContentContainer
                fill={
                    <AttachmentTable
                        attachments={attachments}
                        featureId={featureItem.id}
                        resourceId={resourceId}
                        isSmall
                    />
                }
            />
        </>
    );
}
