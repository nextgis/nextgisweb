import type {
  BasemapConfig,
  WebmapPluginBaselayer,
} from "@nextgisweb/basemap/layer-widget/type";
import type { TileLayerOptions } from "@nextgisweb/webmap/layer-adapter";

import { DEFAULT_SOURCE_MAX_ZOOM } from "../constant";

export function prepareBaselayerConfig(
  config: WebmapPluginBaselayer | BasemapConfig
): TileLayerOptions {
  const name = "keyname" in config ? config.keyname : undefined;
  const layer: TileLayerOptions["layer"] = {
    visible: config.enabled ?? undefined,
    opacity: config.opacity ?? undefined,
    // Put minZoom in layer options (not source options, as with maxZoom) to avoid triggering
    // an avalanche of high‑zoom tiles when zoomed out. Below this zoom, the layer is simply
    // hidden instead of trying to fetch zoom‑18 tiles at zoom‑0, for example.
    // Although this differs from maxZoom’s upscaling behavior, but it makes the map more stable
    // and since minZoom is realy rarely used, it shouldn't cause any problems.
    minZoom: config.z_min ?? undefined,
  };
  const source: TileLayerOptions["source"] = {};

  if (config.type === "vector_tiles") {
    source.url = config.url;
  } else {
    if (config.url) {
      source.url = config.url.replace(/\{[XYZQ]\}/g, (c) => c.toLowerCase());
      source.projection = `EPSG:${config.epsg ?? 3857}`;
    }
    source.maxZoom = config.z_max ?? DEFAULT_SOURCE_MAX_ZOOM;
  }

  return {
    name,
    type: config.type,
    title: config.display_name,
    layer,
    source,
    isBaseLayer: true,
    copyrightUrl: config.copyright_url,
    copyrightText: config.copyright_text,
  };
}
