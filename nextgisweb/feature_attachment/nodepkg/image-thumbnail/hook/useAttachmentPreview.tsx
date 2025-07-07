import {
    Suspense,
    lazy,
    useCallback,
    useMemo,
    useReducer,
    useState,
} from "react";

import type { DataSource } from "@nextgisweb/feature-attachment/attachment-editor/type";
import type { GetProp, Image } from "@nextgisweb/gui/antd";
import { CentralLoading } from "@nextgisweb/gui/component";

import { AttachmentPreviewToolbar } from "../component/AttachmentPreviewToolbar";
import { getImageURL } from "../util/getImageURL";

type PreviewProps = GetProp<typeof Image.PreviewGroup, "preview">;
interface AttachmentPreviewOptions {
    attachments: DataSource[];
    featureId: number | null;
    resourceId: number;
}

const PhotospherePreview = lazy(() => import("../../photosphere-preview"));

function isPanoramaAttachment(attachment: DataSource) {
    const projection =
        "file_meta" in attachment &&
        attachment.file_meta?.panorama?.ProjectionType;
    return projection === "equirectangular";
}

export type Attachment = DataSource & { isPanorama: boolean };

export function useAttachmentPreview({
    attachments: images,
    featureId,
    resourceId,
}: AttachmentPreviewOptions) {
    const [current, setCurrent] = useState(0);

    const [panoramaMode, togglePanoramaMode] = useReducer(
        (state) => !state,
        true
    );

    const previewImages = useMemo<Attachment[]>(() => {
        return images.map((attachment) => ({
            ...attachment,
            isPanorama: isPanoramaAttachment(attachment),
        }));
    }, [images]);

    const onDownload = useCallback(async () => {
        const attachment = previewImages[current];
        const url = await getImageURL({
            featureId,
            resourceId,
            source: attachment,
        });
        if (url) {
            fetch(url)
                .then((response) => response.blob())
                .then((blob) => {
                    const blobUrl = URL.createObjectURL(new Blob([blob]));
                    const link = document.createElement("a");
                    link.href = blobUrl;
                    link.download = attachment.name;
                    document.body.appendChild(link);
                    link.click();
                    URL.revokeObjectURL(blobUrl);
                    link.remove();
                });
        }
    }, [current, featureId, previewImages, resourceId]);

    const previewProps = useMemo<PreviewProps>(() => {
        return {
            style: { backgroundColor: "var(--primary)" },

            toolbarRender: (_, toolbarProps) => {
                const currentImage = previewImages[toolbarProps.current];

                return (
                    <AttachmentPreviewToolbar
                        attachment={currentImage}
                        onDownload={onDownload}
                        panoramaMode={panoramaMode}
                        togglePanoramaMode={togglePanoramaMode}
                        {...toolbarProps}
                    />
                );
            },

            imageRender: (originalNode, info) => {
                return previewImages[info.current].isPanorama &&
                    panoramaMode ? (
                    <Suspense fallback={<CentralLoading />}>
                        <PhotospherePreview url={info.image.url} />
                    </Suspense>
                ) : (
                    originalNode
                );
            },
            onChange: (index) => {
                setCurrent(index);
            },
        };
    }, [onDownload, panoramaMode, previewImages]);

    return { previewProps, current };
}
