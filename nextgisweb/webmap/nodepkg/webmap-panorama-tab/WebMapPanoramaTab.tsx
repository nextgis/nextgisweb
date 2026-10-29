import { useInjection } from "@nextgisweb/pyramid/di";

import { panoramaInjection } from "../panorama/PanoramaStore";
import { PanoramaViewer } from "../panorama/PanoramaViewer";

import "./WebMapPanoramaTab.less";

export function WebMapPanoramaTab() {
  const store = useInjection(panoramaInjection);

  return (
    <PanoramaViewer
      store={store}
      className="ngw-webmap-panorama-tab"
      style={{ height: "100%" }}
    />
  );
}
