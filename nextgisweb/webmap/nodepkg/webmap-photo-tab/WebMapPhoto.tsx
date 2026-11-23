import { observer } from "mobx-react-lite";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
  Photo,
  PhotoLayerStore,
} from "@nextgisweb/webmap/photo/PhotoLayerStore";

import { useDisplayContext } from "../display/context";
import { PhotoPanel } from "../photo/PhotoPanel";
import { getPhotoKey } from "../photo/util/getPhotoKey";

import { registry } from "./registry";

import "./WebMapPhoto.less";

const plugins = registry.queryAll();

export interface WebMapPhotoProps {
  store: PhotoLayerStore;
}

export const WebMapPhoto = observer(({ store }: WebMapPhotoProps) => {
  const { layerId } = store;
  const { display } = useDisplayContext();
  const programmaticExtent = useRef<number[]>(undefined);

  const [selectedKey, setSelectedKey] = useState<string>();

  const selectedPhoto = selectedKey
    ? store.visiblePhotos?.find((p) => getPhotoKey(p) === selectedKey)
    : undefined;

  const select = useCallback((photo: Photo) => {
    const key = getPhotoKey(photo);
    setSelectedKey((prev) => (prev === key ? undefined : key));
  }, []);

  const selectedFeatureId = selectedPhoto?.featureId;

  useEffect(() => {
    if (selectedFeatureId === undefined) return;
    let cancelled = false;
    display.highlighter
      .highlightById(selectedFeatureId, layerId)
      .then(({ geom }) => {
        if (cancelled) return;
        display.map.panToGeom(geom);
        programmaticExtent.current = display.map.getExtent();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      display.highlighter.unhighlight(
        (e) => e.layerId === layerId && e.featureId === selectedFeatureId
      );
    };
  }, [display.highlighter, display.map, layerId, selectedFeatureId]);

  return (
    <div className="ngw-webmap-photo">
      <ActionToolbar
        size="small"
        actions={plugins.map(({ key, component: Tool }) => (
          <Suspense key={key}>
            <Tool
              store={store}
              display={display}
              programmaticExtent={programmaticExtent}
            />
          </Suspense>
        ))}
      />
      <PhotoPanel
        store={store}
        selectedKey={selectedPhoto && selectedKey}
        onSelectPhoto={select}
      />
    </div>
  );
});

WebMapPhoto.displayName = "WebMapPhoto";
