import { gettext } from "@nextgisweb/pyramid/i18n";
import { PanelSection } from "@nextgisweb/webmap/panel/component";
import type { IdentifyExtensionComponentProps } from "@nextgisweb/webmap/panel/identify/identification";

import AttachmentTable from "../attachment-table";
import type { FeatureAttachment } from "../type";

import AttachFileIcon from "@nextgisweb/icon/material/attach_file/fill";

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
        <PanelSection icon={<AttachFileIcon />} title={gettext("Attachments")}>
            <AttachmentTable
                attachments={attachments}
                featureId={featureItem.id}
                resourceId={resourceId}
                isSmall
            />
        </PanelSection>
    );
}
