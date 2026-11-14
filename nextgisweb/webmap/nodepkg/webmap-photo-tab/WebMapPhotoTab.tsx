import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

export interface WebMapPhotoTabProps {
  store: PhotoLayerStore;
}

export const WebMapPhotoTab = observer(({ store }: WebMapPhotoTabProps) => {
  useEffect(() => {
    store.load();
    return () => store.abortLoad();
  }, [store]);

  return <></>;
});

WebMapPhotoTab.displayName = "WebMapPhotoTab";
