import classNames from "classnames";
import { useCallback, useMemo, useState } from "react";

import { AttachmentPreviewGroup } from "@nextgisweb/feature-attachment/image-thumbnail/component/AttachmentPreviewGroup";
import { Image } from "@nextgisweb/gui/antd";
import { ErrorIcon } from "@nextgisweb/gui/icon";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { Photo } from "./PhotoLayerStore";

import OpenIcon from "@nextgisweb/icon/material/open_in_new";
import PhotoIcon from "@nextgisweb/icon/material/photo";

const PHOTO_SIZE = 480;

const msgOpen = gettext("Open");

export interface PhotoItemProps {
  layerId: number;
  photo: Photo;
  selected: boolean;
  onSelect: () => void;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
}

export function PhotoItem({
  layerId,
  photo,
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

  const attachments = useMemo(
    () => [{ ...attachment, description: attachment.name }],
    [attachment]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      onPreviewOpenChange(open);
    },
    [onPreviewOpenChange]
  );

  return (
    <div
      className={classNames("ngw-webmap-photo-item", { selected })}
      onClick={(event) => {
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
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
          />
        </AttachmentPreviewGroup>
      )}
      {status === "loaded" && (
        <button
          type="button"
          className="open"
          title={msgOpen}
          aria-label={msgOpen}
          onClick={(event) => {
            event.stopPropagation();
            onPreviewOpenChange(true);
          }}
        >
          <OpenIcon />
        </button>
      )}
    </div>
  );
}
