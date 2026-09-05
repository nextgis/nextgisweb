import type { Viewer } from "@photo-sphere-viewer/core";
import type { GetProps } from "antd";
import {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type {
  Attachment,
  DataSource,
} from "@nextgisweb/feature-attachment/attachment-editor/type";
import { getAttachmentKey } from "@nextgisweb/feature-attachment/attachment-editor/util/getAttachmentKey";
import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";
import { Image } from "@nextgisweb/gui/antd";
import { CentralLoading } from "@nextgisweb/gui/component";

import type { PhotospherePreviewNode } from "../../photosphere-preview";
import { getFeatureImage } from "../util/getFeatureImage";
import { getImageURL } from "../util/getImageURL";
import { isPanoramaFeatureAttachment } from "../util/isPanoramaFeatureAttachment";

import { AttachmentPreviewToolbar } from "./AttachmentPreviewToolbar";
import { PanoramaStore } from "./PanoramaStore";

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

const PhotospherePreview = lazy(() => import("../../photosphere-preview"));

function isPanoramaAttachment(attachment: DataSource) {
  const projection =
    "file_meta" in attachment && attachment.file_meta?.panorama?.ProjectionType;
  return projection === "equirectangular";
}

function panoramaNodeId(
  attachment: Attachment & FeatureAttachment
): string | undefined {
  return attachment.file_meta.panorama.id;
}

function isLinkedTransition(
  tourNodes: PhotospherePreviewNode[],
  fromNodeId: string | null,
  toNodeId: string
): boolean {
  if (fromNodeId === toNodeId) return true;
  const fromNode = tourNodes.find((node) => node.id === fromNodeId);
  return !!fromNode?.markers?.some((point) => point.target === toNodeId);
}

interface PreviewContextValue {
  open: boolean;
  onThumbnailClick?: (attachment: DataSource) => void;
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
  const [panoramaStore] = useState(() => new PanoramaStore());

  const [panoramaMode, togglePanoramaMode] = useReducer(
    (state: boolean) => !state,
    true
  );

  const previewImages = useMemo<Attachment[]>(() => {
    return images.map((attachment) => ({
      ...attachment,
      isPanorama: isPanoramaAttachment(attachment),
    }));
  }, [images]);

  const indexByKey = useMemo(
    () => new Map(previewImages.map((a, i) => [getAttachmentKey(a), i])),
    [previewImages]
  );

  const onThumbnailClick = useCallback(
    (attachment: DataSource) => {
      setCurrent(
        (current) => indexByKey.get(getAttachmentKey(attachment)) ?? current
      );
    },
    [indexByKey]
  );

  const tourNodes = useMemo<PhotospherePreviewNode[]>(() => {
    if (typeof featureId !== "number") return [];
    return previewImages
      .filter(isPanoramaFeatureAttachment)
      .flatMap((attachment) => {
        const nodeId = panoramaNodeId(attachment);
        if (nodeId === undefined) return [];
        const { url } = getFeatureImage({ featureId, resourceId, attachment });
        return [
          {
            id: nodeId,
            url,
            description: attachment.description,
            markers: attachment.file_meta.panorama.markers,
          },
        ];
      });
  }, [previewImages, featureId, resourceId]);

  const tourViewerRef = useRef<Viewer | null>(null);
  const autorotateShownRef = useRef(false);

  const activeAttachment: Attachment | undefined = previewImages[current];
  const currentNodeId =
    panoramaMode &&
    activeAttachment &&
    isPanoramaFeatureAttachment(activeAttachment)
      ? (panoramaNodeId(activeAttachment) ?? null)
      : null;

  const [lastPanoramaId, setLastPanoramaId] = useState<string | null>(null);
  const [tourKey, setTourKey] = useState(0);

  if (currentNodeId !== lastPanoramaId) {
    if (
      currentNodeId !== null &&
      !isLinkedTransition(tourNodes, lastPanoramaId, currentNodeId)
    ) {
      setTourKey((key) => key + 1);
    }
    setLastPanoramaId(currentNodeId);
  }

  useEffect(() => {
    if (!open) {
      setCurrent(0);
      setLastPanoramaId(null);
      tourViewerRef.current = null;
      autorotateShownRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (
      tourViewerRef.current &&
      activeAttachment &&
      isPanoramaFeatureAttachment(activeAttachment)
    ) {
      panoramaStore.add(activeAttachment.id, tourViewerRef.current);
    }
  }, [activeAttachment, panoramaStore]);

  const onDownload = useCallback(async () => {
    if (!activeAttachment) return;
    const url = await getImageURL({
      featureId,
      resourceId,
      source: activeAttachment,
    });
    if (url) {
      fetch(url)
        .then((response) => response.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(new Blob([blob]));
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = activeAttachment.name;
          document.body.appendChild(link);
          link.click();
          URL.revokeObjectURL(blobUrl);
          link.remove();
        });
    }
  }, [featureId, activeAttachment, resourceId]);

  const previewCallbacks = useMemo<PreviewCallbacks>(() => {
    return {
      countRender: () => undefined,
      actionsRender: (_, toolbarProps) => {
        if (!activeAttachment) return null;

        return (
          <AttachmentPreviewToolbar
            panoramaStore={panoramaStore}
            attachment={activeAttachment}
            onDownload={onDownload}
            panoramaMode={panoramaMode}
            togglePanoramaMode={togglePanoramaMode}
            {...toolbarProps}
          />
        );
      },

      imageRender: (originalNode, info) => {
        const renderPlain = (key: string | number) => (
          <div key={key} className="ngw-preview-img-wrapper">
            {originalNode}
          </div>
        );

        if (!activeAttachment) return renderPlain(info.current);

        const renderedImage = activeAttachment;
        const renderKey = getAttachmentKey(renderedImage);

        if (!panoramaMode || !isPanoramaFeatureAttachment(renderedImage)) {
          return renderPlain(renderKey);
        }

        const nodeId = panoramaNodeId(renderedImage);
        const isTour = nodeId !== undefined;

        const nodes: PhotospherePreviewNode[] = isTour
          ? tourNodes
          : [
              {
                id: "current",
                url: info.image.url,
                description: renderedImage.description,
              },
            ];

        return (
          <Suspense
            key={isTour ? `panorama-tour-${tourKey}` : renderKey}
            fallback={<CentralLoading indicatorStyle={{ color: "white" }} />}
          >
            <PhotospherePreview
              nodes={nodes}
              currentNodeId={isTour ? nodeId : "current"}
              autorotate={!autorotateShownRef.current}
              onReady={(viewer) => {
                tourViewerRef.current = viewer;
                if (viewer) {
                  autorotateShownRef.current = true;
                  panoramaStore.add(renderedImage.id, viewer);
                } else {
                  panoramaStore.delete(renderedImage.id);
                }
              }}
              onNavigate={
                isTour
                  ? (targetNodeId) => {
                      const index = previewImages.findIndex(
                        (a) =>
                          isPanoramaFeatureAttachment(a) &&
                          panoramaNodeId(a) === targetNodeId
                      );
                      if (index !== -1) {
                        setCurrent(index);
                      }
                    }
                  : undefined
              }
            />
          </Suspense>
        );
      },

      onOpenChange: setOpen,
    };
  }, [
    onDownload,
    panoramaMode,
    previewImages,
    activeAttachment,
    panoramaStore,
    tourNodes,
    tourKey,
  ]);

  const previewProps = useMemo<PreviewProps>(
    () => ({
      ...previewCallbacks,
      current,
      onChange: setCurrent,
    }),
    [previewCallbacks, current]
  );

  return (
    <AttachmentPreviewContext value={{ open, onThumbnailClick }}>
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
