/** @plugin */
import { isSldStyle } from "@nextgisweb/webmap/layer-adapter/isSldStyle";
import { mapAdapterRegistry } from "@nextgisweb/webmap/map-adapter/registry";

const SUPPORTED_ADAPTERS = new Set([
  "@nextgisweb/webmap/image-adapter",
  "@nextgisweb/webmap/tile-adapter",
]);
export const adapterPlugin = mapAdapterRegistry(COMP_ID, {
  key: "3d",
  layerSupport: {
    tile: (options) =>
      options.type !== "vector_tiles" &&
      !(
        options.source.url &&
        options.source.projection &&
        options.source.projection !== "EPSG:3857"
      ),
    webmap: (item) => SUPPORTED_ADAPTERS.has(item.adapter),
    geojson: ({ style }) => style === undefined || isSldStyle(style),
  },
  createAdapter: async ({ mapStore }) => {
    const { GiroMapAdapter } = await import("./GiroMapAdapter");
    return new GiroMapAdapter({
      maxZoom: mapStore.maxZoom,
    });
  },
});
