import { useMemo, useState } from "react";

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
}

export function PhotoItem({ layerId, photo }: PhotoItemProps) {
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

  return (
    <div className="ngw-webmap-photo-item" onLoad={() => setStatus("loaded")}>
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
