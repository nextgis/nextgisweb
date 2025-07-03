import { Image } from "@nextgisweb/gui/antd";

import ImageThumbnail from "../image-thumbnail";
import { useAttachmentPreview } from "../image-thumbnail/hook/useAttachmentPreview";

import type { AttachmentTableProps } from "./AttachmentTable";

export function AttachmentImages({
    attachments,
    resourceId,
    featureId,
    isSmall,
}: AttachmentTableProps) {
    const size = isSmall ? 64 : 128;

    const { previewProps } = useAttachmentPreview({
        attachments,
        resourceId,
        featureId,
    });

    return (
        <Image.PreviewGroup preview={previewProps}>
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
        </Image.PreviewGroup>
    );
}
