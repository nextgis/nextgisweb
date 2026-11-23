import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

import { WebMapPhoto } from "./WebMapPhoto";

export interface WebMapPhotoTabProps {
  store: PhotoLayerStore;
}

export function WebMapPhotoTab({ store }: WebMapPhotoTabProps) {
  return <WebMapPhoto store={store} />;
}
