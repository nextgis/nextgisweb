import classNames from "classnames";
import { useCallback, useMemo, useState } from "react";

import { AttachmentPreviewGroup } from "@nextgisweb/feature-attachment/image-thumbnail/component/AttachmentPreviewGroup";
import { Image } from "@nextgisweb/gui/antd";
import { ErrorIcon } from "@nextgisweb/gui/icon";
import { route } from "@nextgisweb/pyramid/api";

import type { Photo } from "./PhotoLayerStore";

import PhotoIcon from "@nextgisweb/icon/material/photo";

const PHOTO_SIZE = 480;

export interface PhotoItemProps {
  layerId: number;
  photo: Photo;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
}

export function PhotoItem({
  layerId,
  photo,
  selectable = false,
  selected,
  onSelect,
  previewOpen,
  onPreviewOpenChange,
}: PhotoItemProps) {
  const { featureId, attachment } = photo;
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );

  const { src, previewSrc } = useMemo(() => {
    const imageRoute = route("feature_attachment.image", {
      id: layerId,
      fid: featureId,
      aid: attachment.id,
    });
    return {
      src: imageRoute.url({
        query: { size: `${PHOTO_SIZE}x${PHOTO_SIZE}` },
      }),
      previewSrc: imageRoute.url(),
    };
  }, [layerId, featureId, attachment.id]);

  const attachments = useMemo(() => [attachment], [attachment]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && selectable) return;
      onPreviewOpenChange(open);
    },
    [onPreviewOpenChange, selectable]
  );

  return (
    <div
      className={classNames("ngw-webmap-photo-item", { selectable, selected })}
      onLoad={() => setStatus("loaded")}
      onClick={(event) => {
        if (!selectable) return;
        if (!event.currentTarget.contains(event.target as Node)) return;
        onSelect();
      }}
    >
      {status !== "loaded" && (
        <div className="placeholder">
          {status === "error" ? <ErrorIcon /> : <PhotoIcon />}
        </div>
      )}
      {status !== "error" && (
        <AttachmentPreviewGroup
          attachments={attachments}
          resourceId={layerId}
          featureId={featureId}
          open={previewOpen}
          onOpenChange={handleOpenChange}
        >
          <Image
            src={src}
            alt={attachment.name}
            title={attachment.description}
            loading="lazy"
            draggable={false}
            preview={{ src: previewSrc }}
            onError={() => setStatus("error")}
          />
        </AttachmentPreviewGroup>
      )}
    </div>
  );
}
