import type { GetProps } from "antd";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type {
  Attachment,
  DataSource,
} from "@nextgisweb/feature-attachment/attachment-editor/type";
import { Image } from "@nextgisweb/gui/antd";

import { getImageURL } from "../util/getImageURL";
import {
  isPanoramaAttachment,
  isPanoramaFeatureAttachment,
} from "../viewers/panorama/panoramaAttachment";
import { usePanoramaViewer } from "../viewers/panorama/usePanoramaViewer";

import { AttachmentPreviewToolbar } from "./AttachmentPreviewToolbar";

import "./AttachmentPreviewGroup.less";

type PreviewGroupProps = GetProps<typeof Image.PreviewGroup>;
type PreviewProps = PreviewGroupProps["preview"];
type PreviewConfig = Extract<PreviewProps, object>;
type PreviewCallbacks = Omit<PreviewConfig, "current" | "onChange">;
interface AttachmentPreviewGroupProps extends PreviewGroupProps {
  attachments: DataSource[];
  featureId: number | null;
  resourceId: number;
  children?: ReactNode;
}

interface PreviewContextValue {
  open: boolean;
  onThumbnailClick?: (index: number) => void;
}
export const AttachmentPreviewContext =
  createContext<PreviewContextValue | null>(null);
AttachmentPreviewContext.displayName = "AttachmentPreviewContext";

export function AttachmentPreviewGroup({
  attachments: images,
  resourceId,
  featureId,
  children,
  ...previewGroupProps
}: AttachmentPreviewGroupProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  const previewImages = useMemo<Attachment[]>(() => {
    return images.map((attachment) => ({
      ...attachment,
      isPanorama: isPanoramaAttachment(attachment),
    }));
  }, [images]);

  const panoramaViewer = usePanoramaViewer({
    previewImages,
    featureId,
    resourceId,
    current,
    open,
    onNavigate: setCurrent,
  });

  useEffect(() => {
    if (!open) {
      setCurrent(0);
    }
  }, [open]);

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

  const previewCallbacks = useMemo<PreviewCallbacks>(() => {
    return {
      countRender: () => undefined,
      actionsRender: (_, toolbarProps) => {
        const currentImage = previewImages[toolbarProps.current];

        return (
          <AttachmentPreviewToolbar
            panoramaStore={panoramaViewer.panoramaStore}
            attachmentId={toolbarProps.current}
            attachment={currentImage}
            onDownload={() => onDownload(toolbarProps.current)}
            panoramaMode={panoramaViewer.panoramaMode}
            togglePanoramaMode={panoramaViewer.togglePanoramaMode}
            {...toolbarProps}
          />
        );
      },

      imageRender: (originalNode, info) => {
        const renderedImage = previewImages[info.current];
        const key = renderedImage.name ?? info.current;

        if (
          panoramaViewer.panoramaMode &&
          isPanoramaFeatureAttachment(renderedImage)
        ) {
          return panoramaViewer.renderImage(renderedImage, info, key);
        }

        return (
          <div key={key} className="ngw-preview-img-wrapper">
            {originalNode}
          </div>
        );
      },

      onOpenChange: setOpen,
    };
  }, [onDownload, previewImages, panoramaViewer]);

  const previewProps = useMemo<PreviewProps>(
    () => ({
      ...previewCallbacks,
      current,
      onChange: setCurrent,
    }),
    [previewCallbacks, current]
  );

  return (
    <AttachmentPreviewContext value={{ open, onThumbnailClick: setCurrent }}>
      <Image.PreviewGroup
        preview={previewProps}
        classNames={{
          popup: {
            root: "ngw-feature-attachment-image-thumbnail-preview",
          },
        }}
        {...previewGroupProps}
      >
        {children}
      </Image.PreviewGroup>
    </AttachmentPreviewContext>
  );
}
