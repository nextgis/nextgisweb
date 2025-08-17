import ImageThumbnail from "../image-thumbnail";
import { AttachmentPreviewGroup } from "../image-thumbnail/component/AttachmentPreviewGroup";

import type { AttachmentTableProps } from "./AttachmentTable";

export function AttachmentImages({
    attachments,
    resourceId,
    featureId,
    isSmall,
}: AttachmentTableProps) {
    const size = isSmall ? 64 : 128;

    return (
        <AttachmentPreviewGroup
            attachments={attachments}
            resourceId={resourceId}
            featureId={featureId}
        >
            {attachments.map((attachment, index) => {
                return (
                    <ImageThumbnail
                        key={index}
                        attachment={attachment}
                        resourceId={resourceId}
                        featureId={featureId}
                        width={size}
                        height={size}
                    />
                );
            })}
        </AttachmentPreviewGroup>
    );
}
