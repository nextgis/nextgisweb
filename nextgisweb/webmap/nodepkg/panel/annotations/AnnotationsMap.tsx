import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import type { Display } from "@nextgisweb/webmap/display";
import { AnnotationsLayer } from "@nextgisweb/webmap/layer/annotations/AnnotationsLayer";

const AnnotationsMap = observer(({ display }: { display: Display }) => {
  const webmapId = display.config.webmapId;
  const { annotationsManager } = display;
  const enabled = annotationsManager.enabled;
  const visibleMode = annotationsManager.visibleMode;
  const filter = annotationsManager.filter;
  const activeGeometryType = annotationsManager.activeGeometryType;
  const editable = !!annotationsManager.activeGeometryType;

  useEffect(() => {
    annotationsManager.start();
  }, [annotationsManager]);

  if (!enabled || visibleMode === null) {
    return null;
  }

  return (
    <AnnotationsLayer
      activeGeometryType={activeGeometryType}
      webmapId={webmapId}
      editable={editable}
      filter={filter}
      visibleMode={visibleMode}
    />
  );
});

AnnotationsMap.displayName = "AnnotationsMap";

export default AnnotationsMap;
