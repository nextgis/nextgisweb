import type { GetProps } from "antd";
import {
    Suspense,
    createContext,
    lazy,
    useCallback,
    useMemo,
    useReducer,
    useState,
} from "react";
import type React from "react";

import type { DataSource } from "@nextgisweb/feature-attachment/attachment-editor/type";
import { Image } from "@nextgisweb/gui/antd";
import { CentralLoading } from "@nextgisweb/gui/component";

import { AttachmentPreviewToolbar } from "../component/AttachmentPreviewToolbar";
import { getImageURL } from "../util/getImageURL";

import { PanoramaStore } from "./PanoramaStore";

type PreviewGroupProps = GetProps<typeof Image.PreviewGroup>;
type PreviewProps = PreviewGroupProps["preview"];
interface AttachmentPreviewGroupProps extends PreviewGroupProps {
    attachments: DataSource[];
    featureId: number | null;
    resourceId: number;
    children?: React.ReactNode;
}

const PhotospherePreview = lazy(() => import("../../photosphere-preview"));

function isPanoramaAttachment(attachment: DataSource) {
    const projection =
        "file_meta" in attachment &&
        attachment.file_meta?.panorama?.ProjectionType;
    return projection === "equirectangular";
}

export type Attachment = DataSource & { isPanorama: boolean };

interface PreviewContextValue {
    visible: boolean;
}
export const AttachmentPreviewContext =
    createContext<PreviewContextValue | null>(null);

export function AttachmentPreviewGroup({
    attachments: images,
    resourceId,
    featureId,
    children,
    ...previewGroupProps
}: AttachmentPreviewGroupProps) {
    const [visible, setVisible] = useState(false);
    const [panoramaStore] = useState(() => new PanoramaStore());

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

    const onDownload = useCallback(
        async (current: number) => {
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
        },
        [featureId, previewImages, resourceId]
    );

    const onVisibleChange = useCallback(
        (nextVisible: boolean) => {
            setVisible(nextVisible);
        },
        [setVisible]
    );

    const previewProps = useMemo<PreviewProps>(() => {
        return {
            rootClassName: "ngw-feature-attachment-image-thumbnail-preview",

            countRender: () => undefined,

            toolbarRender: (_, toolbarProps) => {
                const currentImage = previewImages[toolbarProps.current];

                return (
                    <AttachmentPreviewToolbar
                        panoramaStore={panoramaStore}
                        attachmentId={toolbarProps.current}
                        attachment={currentImage}
                        onDownload={() => onDownload(toolbarProps.current)}
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
                        <PhotospherePreview
                            url={info.image.url}
                            onReady={(viewer) => {
                                if (viewer) {
                                    panoramaStore.add(info.current, viewer);
                                } else {
                                    panoramaStore.delete(info.current);
                                }
                            }}
                        />
                    </Suspense>
                ) : (
                    originalNode
                );
            },
            onVisibleChange,
        };
    }, [
        onDownload,
        onVisibleChange,
        panoramaMode,
        previewImages,
        panoramaStore,
    ]);

    return (
        <AttachmentPreviewContext value={{ visible }}>
            <Image.PreviewGroup preview={previewProps} {...previewGroupProps}>
                {children}
            </Image.PreviewGroup>
        </AttachmentPreviewContext>
    );
}
