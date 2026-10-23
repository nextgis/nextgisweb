import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import type { Display } from "@nextgisweb/webmap/display";
import { AnnotationsLayer } from "@nextgisweb/webmap/layer/annotations/AnnotationsLayer";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import { hasOlMap } from "@nextgisweb/webmap/ol/util/hasOlMap";

const AnnotationsMap = observer(({ display }: { display: Display }) => {
  const { mapStore } = useMapContext();
  const { adapter } = mapStore;
  hasOlMap(adapter);
  const webmapId = display.config.webmapId;
  const { annotationsManager } = display;
  const visibleMode = annotationsManager.visibleMode;
  const filter = annotationsManager.filter;
  const activeGeometryType = annotationsManager.activeGeometryType;
  const editable = !!annotationsManager.activeGeometryType;

  useEffect(() => {
    annotationsManager.start();
  }, [annotationsManager]);

  if (visibleMode === null || !hasOlMap(adapter)) {
    return null;
  }

  return (
    <AnnotationsLayer
      olMap={adapter.map}
      activeGeometryType={activeGeometryType}
      onEditChange={annotationsManager.setEditing}
      webmapId={webmapId}
      editable={editable}
      filter={filter}
      visibleMode={visibleMode}
    />
  );
});

AnnotationsMap.displayName = "AnnotationsMap";

export default AnnotationsMap;
