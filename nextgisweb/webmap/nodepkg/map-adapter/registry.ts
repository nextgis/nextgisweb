/** @registry */
import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { LayerSupport } from "@nextgisweb/webmap/layer-adapter";
import type { CoreLayer } from "@nextgisweb/webmap/layer-adapter/CoreLayer";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import type { MapAdapter } from "./type";

export interface MapAdapterPlugin<TLayer extends CoreLayer = CoreLayer> {
  key: string;
  layerSupport: LayerSupport;
  createAdapter: (options: {
    mapStore: MapStore;
  }) => MapAdapter<TLayer> | Promise<MapAdapter<TLayer>>;
}

export const registry = pluginRegistry<MapAdapterPlugin>(MODULE_NAME);

export function mapAdapterRegistry<TLayer extends CoreLayer>(
  compId: string,
  plugin: MapAdapterPlugin<TLayer>
): void {
  registry.register(compId, plugin);
}
