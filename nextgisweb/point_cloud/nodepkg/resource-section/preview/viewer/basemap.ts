import basemapSettings from "@nextgisweb/basemap/client-settings";
import type { BasemapConfig } from "@nextgisweb/basemap/layer-widget/type";
import {
  createTileLayer,
  prepareBaselayerConfig,
} from "@nextgisweb/basemap/util/baselayer";
import { route } from "@nextgisweb/pyramid/api";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { TileSource } from "./PointCloudViewer";

export interface BasemapOption {
  key: string;
  label: string;
  config: BasemapConfig;
}

// Basemaps in other projections and MapLibre styles can't be rendered by Giro3D
function isSupported(config: BasemapConfig) {
  return (
    !!config.url &&
    (config.type ?? "tms") === "tms" &&
    (config.epsg ?? 3857) === 3857
  );
}

export async function loadBasemapOptions(
  signal?: AbortSignal
): Promise<BasemapOption[]> {
  const result: BasemapOption[] = basemapSettings.basemaps
    .filter(isSupported)
    .map((config) => ({
      key: `preset-${config.keyname}`,
      label: config.display_name,
      config,
    }));

  const resources = (await route("resource.search").get({
    query: { cls: "basemap_layer", serialization: "full" } as Parameters<
      ReturnType<typeof route<"resource.search">>["get"]
    >[0]["query"],
    signal,
  })) as CompositeRead[];

  for (const { resource, basemap_layer: bm } of resources) {
    if (!bm?.url) continue;
    const config: BasemapConfig = {
      keyname: `resource-${resource.id}`,
      display_name: resource.display_name,
      url: bm.url,
      type: bm.type,
      epsg: bm.epsg,
      copyright_text: bm.copyright_text,
      copyright_url: bm.copyright_url,
      z_min: bm.z_min,
      z_max: bm.z_max,
    };
    if (isSupported(config)) {
      result.push({ key: config.keyname, label: config.display_name, config });
    }
  }

  return result;
}

/** Default basemap, chosen the same way as for preview maps */
export function defaultBasemapKey(options: BasemapOption[]) {
  return options.find((o) => o.config.enabled !== false)?.key ?? null;
}

/** Creates an OpenLayers tile source, the same way as for web maps */
export async function createBasemapSource(
  config: BasemapConfig
): Promise<TileSource | null> {
  const layer = await createTileLayer(prepareBaselayerConfig(config));
  return layer && "getTileUrlFunction" in layer.olSource
    ? (layer.olSource as TileSource)
    : null;
}
