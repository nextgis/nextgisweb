import { useEffect, useState } from "react";

import type { DataSource, FileMetaToUpload } from "../attachment-editor/type";
import type { FeatureAttachment } from "../type";

import { getFeatureImage } from "./util/getFeatureImage";
import { getFileImage } from "./util/getFileImage";

import { EyeOutlined } from "@ant-design/icons";
import "./ImageThumbnail.less";

export type ImageThumbnailProps = {
    attachment: DataSource;
    resourceId: number;
    featureId: number;
    previewSize?: string;
    width?: number;
    height?: number;
    onClick?: (attachment: DataSource) => void;
};

export function isFeatureAttachment(file: unknown): file is FeatureAttachment {
    return (file as FeatureAttachment).file_meta !== undefined;
}

export const ImageThumbnail = ({
    onClick,
    width = 80,
    height,
    featureId,
    resourceId,
    attachment,
}: ImageThumbnailProps) => {
    const [url, setUrl] = useState<string>();
    useEffect(() => {
        async function fetchImage() {
            if (!isFeatureAttachment(attachment)) {
                const newAttachment = attachment as FileMetaToUpload;
                const file_ = newAttachment._file as File;
                const url_ = await getFileImage(file_);
                setUrl(url_);
            } else {
                const attachment_ = attachment as FeatureAttachment;
                const { url: url_ } = getFeatureImage({
                    featureId,
                    resourceId,
                    attachment: attachment_,
                    height: height,
                    width: width,
                });
                setUrl(url_);
            }
        }
        fetchImage();
    }, []);

    return (
        <div
            className="ngw-feature-attachment-image-thumbnail"
            style={{ width: width }}
            onClick={(event) => {
                if (event.ctrlKey && url) {
                    window.open(
                        url.split("?")[0],
                        "_feature_attachment",
                        `location=${window.location.href}`
                    );
                } else {
                    if (onClick) onClick(attachment);
                }
            }}
        >
            <div className="overlay">
                <EyeOutlined />
            </div>
            <img width="100%" height="auto" src={url} draggable={false} />
        </div>
    );
};
