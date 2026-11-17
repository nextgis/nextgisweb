import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

import { WebMapPanorama } from "./WebMapPanorama";

export interface WebMapPhotoTabProps {
  store: PhotoLayerStore;
}

export function WebMapPhotoTab({ store }: WebMapPhotoTabProps) {
  return <WebMapPanorama store={store} />;
}
