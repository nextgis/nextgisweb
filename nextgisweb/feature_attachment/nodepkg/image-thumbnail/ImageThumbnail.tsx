import { useContext, useEffect, useMemo, useState } from "react";

import { Image } from "@nextgisweb/gui/antd";
import type { GetProp } from "@nextgisweb/gui/antd";
import { useKeydownListener } from "@nextgisweb/gui/hook";

import type { DataSource } from "../attachment-editor/type";

import { AttachmentPreviewContext } from "./component/AttachmentPreviewGroup";
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
    const [thumbUrl, setThumbUrl] = useState<string>();
    const [selfImageVisible, setSelfImageVisible] = useState(false);

    const ctx = useContext(AttachmentPreviewContext);

    // When an image is rendered inside Image.PreviewGroup, the built-in
    // Image.preview.onVisibleChange callback does not fire.
    // Instead, we rely on the AttachmentPreviewContext context
    // to track the current preview visibility state in group.
    const previewVisible = useMemo(
        () => (ctx ? ctx.visible : selfImageVisible),
        [ctx, selfImageVisible]
    );

    const imageUrl = useMemo(() => thumbUrl?.split("?")[0], [thumbUrl]);

    useEffect(() => {
        async function fetchImage() {
            const url = await getImageURL({
                source: attachment,
                featureId,
                resourceId,
                height,
                width,
            });
            setThumbUrl(url);
        }
        fetchImage();
    }, [attachment, featureId, height, resourceId, width]);

    const ctrlPressed = useKeydownListener("Control");

    const isCtrlMode = ctrlPressed && !previewVisible;

    const previewProps = useMemo(() => {
        return isCtrlMode
            ? false
            : preview !== undefined
              ? preview
              : {
                    src: imageUrl,
                    onVisibleChange: setSelfImageVisible,
                };
    }, [isCtrlMode, preview, imageUrl]);

    return (
        <Image
            src={thumbUrl}
            width={width}
            onClick={() => {
                if (isCtrlMode && imageUrl) {
                    window.open(
                        imageUrl,
                        "_feature_attachment",
                        `location=${window.location.href}`
                    );
                }
            }}
            preview={previewProps}
        />
    );
};
