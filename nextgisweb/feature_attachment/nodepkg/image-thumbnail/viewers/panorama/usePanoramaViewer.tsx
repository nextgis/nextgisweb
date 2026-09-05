import type { Viewer } from "@photo-sphere-viewer/core";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { Attachment } from "@nextgisweb/feature-attachment/attachment-editor/type";
import type { PhotospherePreviewNode } from "@nextgisweb/feature-attachment/photosphere-preview";
import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";
import { CentralLoading } from "@nextgisweb/gui/component";

import { getFeatureImage } from "../../util/getFeatureImage";

import { PanoramaStore } from "./PanoramaStore";
import {
  isLinkedTransition,
  isPanoramaFeatureAttachment,
  panoramaNodeId,
} from "./panoramaAttachment";

const PhotospherePreview = lazy(() => import("../../../photosphere-preview"));

interface ImageRenderInfo {
  current: number;
  image: { url: string };
}

interface UsePanoramaViewerParams {
  previewImages: Attachment[];
  featureId: number | null;
  resourceId: number;
  current: number;
  open: boolean;
  onNavigate: (index: number) => void;
}

export function usePanoramaViewer({
  previewImages,
  featureId,
  resourceId,
  current,
  open,
  onNavigate,
}: UsePanoramaViewerParams) {
  const [panoramaStore] = useState(() => new PanoramaStore());
  const [panoramaMode, togglePanoramaMode] = useReducer(
    (state: boolean) => !state,
    true
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

  const currentImage: Attachment | undefined = previewImages[current];
  const currentNodeId =
    panoramaMode && currentImage && isPanoramaFeatureAttachment(currentImage)
      ? (panoramaNodeId(currentImage) ?? null)
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
      setLastPanoramaId(null);
      tourViewerRef.current = null;
      autorotateShownRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (tourViewerRef.current) {
      panoramaStore.add(current, tourViewerRef.current);
    }
  }, [current, panoramaStore]);

  const renderImage = useCallback(
    (
      renderedImage: Attachment & FeatureAttachment,
      info: ImageRenderInfo,
      key: string | number
    ): ReactNode => {
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
          key={isTour ? `panorama-tour-${tourKey}` : key}
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
                panoramaStore.add(info.current, viewer);
              } else {
                panoramaStore.delete(info.current);
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
                      onNavigate(index);
                    }
                  }
                : undefined
            }
          />
        </Suspense>
      );
    },
    [tourNodes, tourKey, panoramaStore, previewImages, onNavigate]
  );

  return useMemo(
    () => ({ panoramaMode, togglePanoramaMode, panoramaStore, renderImage }),
    [panoramaMode, panoramaStore, renderImage]
  );
}
