import { useEffect, useState } from "react";

import ImageThumbnail from "../image-thumbnail";
import { AttachmentPreviewGroup } from "../image-thumbnail/component/AttachmentPreviewGroup";
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
        <AttachmentPreviewGroup
            attachments={attachments}
            resourceId={resourceId}
            featureId={featureId}
            items={items}
        >
            <ImageThumbnail
                attachment={attachment}
                resourceId={resourceId}
                featureId={featureId}
                width={width}
                height={height}
            />
        </AttachmentPreviewGroup>
    );
}
