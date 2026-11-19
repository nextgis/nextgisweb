import { observer } from "mobx-react-lite";
import { useEffect, useMemo } from "react";

import { message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
  Photo,
  PhotoLayerStore,
} from "@nextgisweb/webmap/photo/PhotoLayerStore";

import { useDisplayContext } from "../display/context";
import { PhotoPanel } from "../photo/PhotoPanel";

import { WebMapPhotoToolbar } from "./WebMapPhotoToolbar";
import { useExtentFilter } from "./hook/useExtentFilter";
import { usePhotoSelection } from "./hook/usePhotoSelection";

import "./WebMapPanorama.less";

const msgExtentFilterFailed = gettext("Failed to filter photos by map extent");

export interface WebMapPanoramaProps {
  store: PhotoLayerStore;
}

export const WebMapPanorama = observer(({ store }: WebMapPanoramaProps) => {
  const { layerId } = store;
  const { display } = useDisplayContext();
  const [messageApi, contextHolder] = message.useMessage();

  const extentFilter = useExtentFilter({
    store,
    display,
    onError: () => messageApi.error(msgExtentFilterFailed),
  });

  const { photos } = store;
  const { featureIds, moveKeepingFilter } = extentFilter;
  const { visiblePhotos, excludePhotos } = useMemo(() => {
    if (!photos || !featureIds) {
      return { visiblePhotos: photos, excludePhotos: undefined };
    }
    const visible: Photo[] = [];
    const excluded: Photo[] = [];
    for (const p of photos) {
      (featureIds.has(p.featureId) ? visible : excluded).push(p);
    }
    return { visiblePhotos: visible, excludePhotos: excluded };
  }, [photos, featureIds]);

  const selection = usePhotoSelection(visiblePhotos);

  const selectedFeatureId = selection.selectedPhoto?.featureId;

  useEffect(() => {
    if (selectedFeatureId === undefined) return;
    let cancelled = false;
    display.highlighter
      .highlightById(selectedFeatureId, layerId)
      .then(({ geom }) => {
        if (cancelled) return;
        moveKeepingFilter(() => display.map.panToGeom(geom));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      display.highlighter.unhighlight(
        (e) => e.layerId === layerId && e.featureId === selectedFeatureId
      );
    };
  }, [
    display.highlighter,
    display.map,
    layerId,
    moveKeepingFilter,
    selectedFeatureId,
  ]);

  return (
    <div className="ngw-webmap-panorama">
      {contextHolder}
      <WebMapPhotoToolbar
        extentFilterStatus={extentFilter.status}
        onExtentFilterToggle={extentFilter.toggle}
      />
      <PhotoPanel
        store={store}
        excludePhotos={excludePhotos}
        selectedKey={selection.selectedPhoto && selection.selectedKey}
        onSelectPhoto={selection.select}
      />
    </div>
  );
});

WebMapPanorama.displayName = "WebMapPanorama";
