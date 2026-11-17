import { observer } from "mobx-react-lite";
import { useEffect, useMemo } from "react";

import { message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

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
  const { clear: clearExtentFilter } = extentFilter;

  const { photos } = store;
  const { featureIds } = extentFilter;
  const visiblePhotos = useMemo(
    () =>
      photos && featureIds
        ? photos.filter((p) => featureIds.has(p.featureId))
        : photos,
    [photos, featureIds]
  );

  const selection = usePhotoSelection(visiblePhotos, clearExtentFilter);

  const selectedFeatureId = selection.selected?.featureId;
  const { moveKeepingFilter } = extentFilter;

  useEffect(() => {
    if (selection.selectedKey === undefined) return;
    return () => {
      display.highlighter.unhighlight(
        (e) => e.layerId === layerId && e.featureId === selectedFeatureId
      );
    };
  }, [display, layerId, selection.selectedKey, selectedFeatureId]);

  const goTo = async () => {
    if (selectedFeatureId === undefined) return;
    try {
      const { geom } = await display.highlighter.highlightById(
        selectedFeatureId,
        layerId
      );
      moveKeepingFilter(() => display.map.panToGeom(geom));
    } catch {
      return;
    }
  };

  return (
    <div className="ngw-webmap-panorama">
      {contextHolder}
      <WebMapPhotoToolbar
        mode={selection.mode}
        hasSelection={!!selection.selected}
        extentFilter={extentFilter.status}
        onModeChange={selection.changeMode}
        onOpen={selection.openSelected}
        onGoTo={goTo}
        onExtentFilterToggle={extentFilter.toggle}
      />
      <PhotoPanel
        store={store}
        photos={visiblePhotos}
        selectable={selection.selectable}
        selectedKey={selection.selectedKey}
        onSelect={selection.select}
        previewKey={selection.previewKey}
        onPreviewChange={selection.setPreviewKey}
      />
    </div>
  );
});

WebMapPanorama.displayName = "WebMapPanorama";
