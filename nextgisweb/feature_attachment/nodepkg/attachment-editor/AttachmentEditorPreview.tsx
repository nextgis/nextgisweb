import { useEffect, useState } from "react";

import { Image } from "@nextgisweb/gui/antd";

import ImageThumbnail from "../image-thumbnail";
import { useAttachmentPreview } from "../image-thumbnail/hook/useAttachmentPreview";
import { getImageURL } from "../image-thumbnail/util/getImageURL";

import type { DataSource } from "./type";

interface AttachmentEditorPreviewProps {
    attachment: DataSource;
    attachments: DataSource[];
    resourceId: number;
    featureId: number | null;
    width?: number;
    height?: number;
}

export function AttachmentEditorPreview({
    attachments,
    attachment,
    resourceId,
    featureId,
    width,
    height,
}: AttachmentEditorPreviewProps) {
    const { previewProps } = useAttachmentPreview({
        attachments,
        resourceId,
        featureId,
    });
    const [items, setItems] = useState<string[]>([]);

    useEffect(() => {
        async function getItemsURLs() {
            const urls: string[] = [];
            for (const source of attachments) {
                const url_ = await getImageURL({
                    source,
                    featureId,
                    resourceId,
                });
                if (url_) {
                    urls.push(url_);
                }
            }
            setItems(urls);
        }
        getItemsURLs();
    }, [attachment, attachments, featureId, resourceId]);

    return (
        <Image.PreviewGroup items={items} preview={previewProps}>
            <ImageThumbnail
                attachment={attachment}
                resourceId={resourceId}
                featureId={featureId}
                width={width}
                height={height}
            />
        </Image.PreviewGroup>
    );
}
