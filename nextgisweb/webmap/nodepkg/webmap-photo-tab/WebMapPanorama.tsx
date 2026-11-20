import { observer } from "mobx-react-lite";
import { Suspense, useEffect, useRef } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

import { useDisplayContext } from "../display/context";
import { PhotoPanel } from "../photo/PhotoPanel";

import { usePhotoSelection } from "./hook/usePhotoSelection";
import { registry } from "./registry";

import "./WebMapPanorama.less";

const plugins = registry.queryAll();

export interface WebMapPanoramaProps {
  store: PhotoLayerStore;
}

export const WebMapPanorama = observer(({ store }: WebMapPanoramaProps) => {
  const { layerId } = store;
  const { display } = useDisplayContext();
  const programmaticExtent = useRef<number[]>(undefined);

  const selection = usePhotoSelection(store.visiblePhotos);

  const selectedFeatureId = selection.selectedPhoto?.featureId;

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
    <div className="ngw-webmap-panorama">
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
        selectedKey={selection.selectedPhoto && selection.selectedKey}
        onSelectPhoto={selection.select}
      />
    </div>
  );
});

WebMapPanorama.displayName = "WebMapPanorama";
