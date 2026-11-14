import { observer } from "mobx-react-lite";

import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

import { PhotoPanel } from "../photo/PhotoPanel";

export interface WebMapPhotoTabProps {
  store: PhotoLayerStore;
}

export const WebMapPhotoTab = observer(({ store }: WebMapPhotoTabProps) => {
  return <PhotoPanel store={store} style={{ height: "100%" }} />;
});

WebMapPhotoTab.displayName = "WebMapPhotoTab";
