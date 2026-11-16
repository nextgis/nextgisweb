import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { CentralLoading } from "@nextgisweb/gui/component";
import { ErrorIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { PhotoItem } from "./PhotoItem";
import type { PhotoLayerStore } from "./PhotoLayerStore";

import PhotoIcon from "@nextgisweb/icon/material/photo";

import "./PhotoPanel.less";

export interface PhotoPanelProps {
  store: PhotoLayerStore;
  className?: string;
  style?: CSSProperties;
}

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
  ({ store, className, style }: PhotoPanelProps) => {
    const { visiblePhotos, error, layerId } = store;

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
        className={classNames("ngw-webmap-photo-panel", className)}
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
          <div className="strip">
            {visiblePhotos.map((p) => (
              <PhotoItem
                key={`${p.featureId}-${p.attachment.id}`}
                layerId={layerId}
                photo={p}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

PhotoPanel.displayName = "PhotoPanel";
