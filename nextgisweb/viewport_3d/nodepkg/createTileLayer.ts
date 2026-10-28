import type Instance from "@giro3d/giro3d/core/Instance";
import NullSource from "@giro3d/giro3d/sources/NullSource";
import TiledImageSource from "@giro3d/giro3d/sources/TiledImageSource";
import XYZ from "ol/source/XYZ";
import type { TileCoord } from "ol/tilecoord";

import { DEFAULT_SOURCE_MAX_ZOOM } from "@nextgisweb/basemap/constant";
import type { TileLayerOptions } from "@nextgisweb/webmap/layer-adapter";

import { GiroLayerAdapter } from "./GiroLayerAdapter";
import { imageFormat } from "./imageFormat";

function quadKey([z, x, y]: TileCoord): string {
  let key = "";
  for (let level = z; level > 0; level--) {
    const mask = 1 << (level - 1);
    key += (x & mask ? 1 : 0) + (y & mask ? 2 : 0);
  }
  return key;
}

export function createTileLayer(
  instance: Instance,
  options: TileLayerOptions,
  onOrderChange: () => void
): GiroLayerAdapter {
  const { source: sourceOptions } = options;
  let source;
  if (sourceOptions.url) {
    const xyz = new XYZ({
      ...sourceOptions,
      maxZoom: sourceOptions.maxZoom ?? DEFAULT_SOURCE_MAX_ZOOM,
      minZoom: Math.max(
        sourceOptions.minZoom ?? 0,
        options.layer?.minZoom ?? 0
      ),
      crossOrigin: "anonymous",
    });
    if (sourceOptions.url.includes("{q}")) {
      xyz.setTileUrlFunction((coord) =>
        sourceOptions.url?.replace("{q}", quadKey(coord))
      );
    }
    const tileUrlFunction = xyz.getTileUrlFunction();
    xyz.setTileUrlFunction((...args) => {
      const url = tileUrlFunction.apply(xyz, args);
      return url ? new URL(url, location.href).href : undefined;
    });
    source = new TiledImageSource({ source: xyz, format: imageFormat });
  } else {
    source = new NullSource();
  }
  return new GiroLayerAdapter(
    instance,
    {
      ...options,
      visible: options.layer?.visible,
      opacity: options.layer?.opacity,
    },
    source,
    onOrderChange
  );
}
