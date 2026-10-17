import { PanoramaViewer } from "../panorama/PanoramaViewer";

import type { WebMapPanoramaStore } from "./WebMapPanoramaStore";

import "./WebMapPanoramaTab.less";

interface WebMapPanoramaTabProps {
  store: WebMapPanoramaStore;
}

export function WebMapPanoramaTab({ store }: WebMapPanoramaTabProps) {
  return (
    <PanoramaViewer
      store={store}
      className="ngw-webmap-panorama-tab"
      style={{ height: "100%" }}
    />
  );
}
