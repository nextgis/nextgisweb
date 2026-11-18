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
  selectable: boolean;
  selectedKey: string | undefined;
  onSelect: (photo: Photo) => void;
  photos?: Photo[];
  previewKey?: string;
  onPreviewChange?: (key: string | undefined) => void;
  className?: string;
  style?: CSSProperties;
}

const STRIP_GAP = 8;

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
    selectable = false,
    selectedKey,
    onSelect,
    photos,
    previewKey,
    onPreviewChange,
    className,
    style,
  }: PhotoPanelProps) => {
    const { error, layerId } = store;
    const visiblePhotos = photos ?? store.photos;

    const [strip, setStrip] = useState<HTMLDivElement | null>(null);
    useWheelHorizontalScroll(strip);
    const edges = useScrollEdges(strip, visiblePhotos);
    const itemSize = useContentHeight(strip);

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

    const [innerPreviewKey, setInnerPreviewKey] = useState<string>();
    const controlled = onPreviewChange !== undefined;
    const previewOpenKey = controlled ? previewKey : innerPreviewKey;
    const setPreviewOpenKey = controlled ? onPreviewChange : setInnerPreviewKey;

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
        style={style}
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
                    style={{ left: v.start, width: v.size }}
                  >
                    <PhotoItem
                      layerId={layerId}
                      photo={p}
                      selectable={selectable}
                      selected={key === selectedKey}
                      onSelect={() => onSelect(p)}
                      previewOpen={previewOpenKey === key}
                      onPreviewOpenChange={(open) =>
                        setPreviewOpenKey(open ? key : undefined)
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
