import { useVirtualizer } from "@tanstack/react-virtual";
import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { CentralLoading } from "@nextgisweb/gui/component";
import { ErrorIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { PhotoItem } from "./PhotoItem";
import type { Photo, PhotoLayerStore } from "./PhotoLayerStore";
import { useContentHeight } from "./hook/useContentHeight";
import { useScrollEdges } from "./hook/useScrollEdges";
import { useWheelHorizontalScroll } from "./hook/useWheelHorizontalScroll";
import { getPhotoKey } from "./util/getPhotoKey";

import PhotoIcon from "@nextgisweb/icon/material/photo";

import "./PhotoPanel.less";

export interface PhotoPanelProps {
  store: PhotoLayerStore;
  selectedKey: string | undefined;
  onSelectPhoto: (photo: Photo) => void;
  className?: string;
  style?: CSSProperties;
}

const STRIP_GAP = 8;
const SCROLLBAR_RESERVE = 24;

const placeholders = {
  empty: {
    Icon: PhotoIcon,
    message: gettext("No photos to display"),
  },
  error: {
    Icon: ErrorIcon,
    message: gettext("Failed to load photos"),
  },
};

export const PhotoPanel = observer(
  ({
    store,
    selectedKey,
    onSelectPhoto,
    className,
    style,
  }: PhotoPanelProps) => {
    const { error, layerId, visiblePhotos } = store;

    const [strip, setStrip] = useState<HTMLDivElement | null>(null);
    useWheelHorizontalScroll(strip);
    const edges = useScrollEdges(strip, visiblePhotos);
    const itemSize = Math.max(0, useContentHeight(strip) - SCROLLBAR_RESERVE);

    const virtualizer = useVirtualizer({
      horizontal: true,
      count: visiblePhotos?.length ?? 0,
      getScrollElement: () => strip,
      estimateSize: () => itemSize,
      getItemKey: (index) => getPhotoKey(visiblePhotos![index]),
      gap: STRIP_GAP,
      paddingStart: STRIP_GAP,
      paddingEnd: STRIP_GAP,
      overscan: 3,
    });

    useEffect(() => {
      virtualizer.measure();
    }, [virtualizer, itemSize]);

    const [previewKey, setPreviewKey] = useState<string>();

    useEffect(() => {
      store.activate();
      return () => store.deactivate();
    }, [store]);

    const placeholder = error
      ? placeholders.error
      : visiblePhotos?.length === 0
        ? placeholders.empty
        : undefined;

    return (
      <div
        className={classNames("ngw-webmap-photo-panel", className, {
          "shadow-start": edges.start,
          "shadow-end": edges.end,
        })}
        style={
          {
            ...style,
            "--scrollbar-reserve": `${SCROLLBAR_RESERVE}px`,
          } as CSSProperties
        }
      >
        {placeholder ? (
          <div className="placeholder">
            <placeholder.Icon />
            <span>{placeholder.message}</span>
          </div>
        ) : !visiblePhotos ? (
          <div className="loading">
            <CentralLoading />
          </div>
        ) : (
          <div ref={setStrip} className="strip">
            <div
              className="track"
              style={{ width: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((v) => {
                const p = visiblePhotos[v.index];
                const key = v.key as string;
                return (
                  <div
                    key={key}
                    className="cell"
                    style={{ left: v.start, width: v.size, height: v.size }}
                  >
                    <PhotoItem
                      layerId={layerId}
                      photo={p}
                      selected={key === selectedKey}
                      onSelect={() => onSelectPhoto(p)}
                      previewOpen={previewKey === key}
                      onPreviewOpenChange={(open) =>
                        setPreviewKey(open ? key : undefined)
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PhotoPanel.displayName = "PhotoPanel";
