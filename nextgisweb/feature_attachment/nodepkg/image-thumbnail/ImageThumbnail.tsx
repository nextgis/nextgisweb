import { useEffect, useState } from "react";

import { Image } from "@nextgisweb/gui/antd";
import type { GetProp } from "@nextgisweb/gui/antd";
import { useKeydownListener } from "@nextgisweb/gui/hook";

import type { DataSource } from "../attachment-editor/type";

import { getImageURL } from "./util/getImageURL";

import "./ImageThumbnail.less";

export type ImageThumbnailProps = {
    attachment: DataSource;
    resourceId: number;
    featureId: number | null;
    previewSize?: string;
    width?: number;
    height?: number;
    onClick?: (attachment: DataSource) => void;
    preview?: GetProp<typeof Image, "preview">;
};

export const ImageThumbnail = ({
    width = 80,
    height,
    preview,
    featureId,
    resourceId,
    attachment,
}: ImageThumbnailProps) => {
    const [url, setUrl] = useState<string>();

    useEffect(() => {
        async function fetchImage() {
            const url_ = await getImageURL({
                source: attachment,
                featureId,
                resourceId,
                height,
                width,
            });
            setUrl(url_);
        }
        fetchImage();
    }, [attachment, featureId, height, resourceId, width]);

    const ctrlPressed = useKeydownListener("Control");

    return (
        <Image
            src={url}
            width={width}
            onClick={() => {
                if (ctrlPressed && url) {
                    window.open(
                        url.split("?")[0],
                        "_feature_attachment",
                        `location=${window.location.href}`
                    );
                }
            }}
            preview={
                ctrlPressed
                    ? false
                    : preview !== undefined
                      ? preview
                      : {
                            src: url?.split("?")[0],
                        }
            }
        />
    );
};
