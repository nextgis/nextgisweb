/** @registry */
import type { FC, LazyExoticComponent } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { Display } from "@nextgisweb/webmap/display";
import type { PhotoLayerStore } from "@nextgisweb/webmap/photo/PhotoLayerStore";

export interface PhotoToolPluginProps {
  store: PhotoLayerStore;
  display: Display;
  programmaticExtent: { current: number[] | undefined };
}

export interface PhotoToolPlugin {
  key: string;
  order?: number;
  component: LazyExoticComponent<FC<PhotoToolPluginProps>>;
}

export const registry = pluginRegistry<PhotoToolPlugin>(MODULE_NAME, {
  sortKeyFn: (p) => p.order ?? 0,
});
