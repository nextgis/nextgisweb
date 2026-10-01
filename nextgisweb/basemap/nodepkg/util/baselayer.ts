import type Tile from "ol/Tile";
import TileState from "ol/TileState";
import type { Options as XYZSourceOptions } from "ol/source/XYZ";

import type {
  BasemapConfig,
  WebmapPluginBaselayer,
} from "@nextgisweb/basemap/layer-widget/type";
import { registerEPSG3395Projection } from "@nextgisweb/basemap/util/epsg3395";
import { isAbortError } from "@nextgisweb/gui/error";
import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { RequestQueue, tileLoadFunction } from "@nextgisweb/pyramid/util";
import type { LayerOptions } from "@nextgisweb/webmap/ol/layer/CoreLayer";
import type QuadKey from "@nextgisweb/webmap/ol/layer/QuadKey";
import type XYZ from "@nextgisweb/webmap/ol/layer/XYZ";

import { DEFAULT_SOURCE_MAX_ZOOM } from "../constant";
import type MapLibreAdapter from "../maplibre-adapter/MapLibreAdapter";

type Baselayer = QuadKey | XYZ | MapLibreAdapter;

export interface BaselayerOptions {
  source: Omit<XYZSourceOptions, "attributions">;
  layer?: LayerOptions;
  keyname?: string;
  copyrightText?: string | null;
  copyrightUrl?: string | null;
  type?: BasemapConfig["type"];
}

const SAFE_URL_RE = new RegExp(pyramidSettings.urlSafePattern);

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function buildAttributionHtml(
  text?: string | null,
  url?: string | null
): string | undefined {
  if (!text) return undefined;
  const safeText = escapeHtml(text);
  return url && SAFE_URL_RE.test(url)
    ? `<a href="${escapeHtml(url)}" target="_blank">${safeText}</a>`
    : safeText;
}

let idx = 0;

const basemapTileQueue = new RequestQueue({
  limit: 20,
  timeout: 15_000,
});

function basemapTileLoadFunction(tile: Tile, src: string) {
  // @ts-expect-error Property 'getImage' does not exist on type 'Tile'.
  const img = tile.getImage() as HTMLImageElement;

  basemapTileQueue.add(
    ({ signal }) =>
      tileLoadFunction({
        src,
        signal,
        sentryMetricOptions: { component: COMP_ID, baseUrl: undefined },
      })
        .then((imageUrl) => {
          if (!signal.aborted) {
            img.src = imageUrl;
          }
        })
        .catch((err) => {
          if (!isAbortError(err)) {
            tile.setState(TileState.ERROR);
          }
        }),

    {
      abort: () => {
        tile.setState(TileState.ERROR);
      },
    }
  );
}

export function prepareBaselayerConfig(
  config: WebmapPluginBaselayer | BasemapConfig
): {
  source: XYZSourceOptions;
  layer: LayerOptions;
  keyname?: string;
  copyrightText?: string | null;
  copyrightUrl?: string | null;
  type?: BasemapConfig["type"];
} {
  const layer = {} as LayerOptions;
  const source = {} as XYZSourceOptions;

  const keyname = "keyname" in config ? config.keyname : undefined;
  layer.title = config.display_name;

  if ("type" in config && config.type === "vector_tiles") {
    return {
      type: config.type,
      source: { url: config.url },
      layer: {
        ...layer,
        visible: config.enabled ?? undefined,
        opacity: config.opacity ?? undefined,
        minZoom: config.z_min ?? undefined,
      },
      keyname,
      copyrightText: config.copyright_text,
      copyrightUrl: config.copyright_url,
    };
  }

  if (config.url) {
    source.url = config.url.replace(/\{[XYZQ]\}/g, (c) => c.toLowerCase());
    source.projection = `EPSG:${config.epsg ?? 3857}`;
  }
  if (source.projection === "EPSG:3395") {
    registerEPSG3395Projection();
  }

  if ("z_min" in config && typeof config.z_min === "number") {
    source.minZoom = config.z_min;
  }
  if ("z_max" in config && typeof config.z_max === "number") {
    source.maxZoom = config.z_max;
  }

  if (source.maxZoom === undefined) {
    source.maxZoom = DEFAULT_SOURCE_MAX_ZOOM;
  }

  if (source.minZoom !== undefined) {
    // Put minZoom in layer options (not source options, as with maxZoom) to avoid triggering
    // an avalanche of high‑zoom tiles when zoomed out. Below this zoom, the layer is simply
    // hidden instead of trying to fetch zoom‑18 tiles at zoom‑0, for example.
    // Although this differs from maxZoom’s upscaling behavior, but it makes the map more stable
    // and since minZoom is realy rarely used, it shouldn't cause any problems.
    layer.minZoom = source.minZoom;
    delete source.minZoom;
  }

  layer.opacity = config.opacity ? config.opacity : undefined;
  layer.visible = config.enabled ?? undefined;

  source.crossOrigin = "anonymous";
  source.tileLoadFunction = basemapTileLoadFunction;
  return {
    source,
    layer,
    keyname,
    copyrightText: config.copyright_text,
    copyrightUrl: config.copyright_url,
  };
}

export async function createTileLayer({
  source,
  layer: layerOptions,
  keyname,
  copyrightText,
  copyrightUrl,
  type = "tms",
}: BaselayerOptions): Promise<Baselayer | undefined> {
  if (!keyname) {
    keyname = `basemap_${idx++}`;
  }

  const sourceWithAttributions: XYZSourceOptions = {
    ...source,
    attributions: buildAttributionHtml(copyrightText, copyrightUrl),
  };

  try {
    if (type === "vector_tiles") {
      if (!source.url) throw new Error("MapLibre style URL is required");
      const { default: MapLibreAdapter } =
        await import("../maplibre-adapter/MapLibreAdapter");
      return new MapLibreAdapter(keyname, layerOptions, {
        url: source.url,
        attributions: sourceWithAttributions.attributions,
      });
    }
    const MID = sourceWithAttributions.url?.includes("{q}")
      ? (await import("@nextgisweb/webmap/ol/layer/QuadKey")).default
      : (await import("@nextgisweb/webmap/ol/layer/XYZ")).default;

    const layer = new MID(keyname, layerOptions, sourceWithAttributions);

    return layer as QuadKey | XYZ;
  } catch (err) {
    console.warn(`Can't initialize layer [${keyname}]: ${err}`);
  }
}

export async function createBaselayer(
  options: BaselayerOptions
): Promise<Baselayer | undefined> {
  const layer = await createTileLayer(options);
  if (layer) {
    layer.isBaseLayer = true;
  }
  return layer;
}

export async function createBasemaps(
  basemaps: WebmapPluginBaselayer[] | BasemapConfig[]
): Promise<Baselayer[]> {
  let isDefaultExisted = false;
  const layers: Baselayer[] = [];
  for (const { ...bm } of basemaps) {
    try {
      if (bm.enabled && !isDefaultExisted) {
        isDefaultExisted = true;
      } else {
        bm.enabled = false;
      }

      const opts = prepareBaselayerConfig(bm);
      const layer = await createBaselayer(opts);
      if (layer) {
        layers.push(layer);
      }
    } catch {
      //
    }
  }

  const blankLayer = await createBaselayer({
    layer: {
      title: "None",
      visible: !isDefaultExisted,
    },
    source: {},
    keyname: "blank",
  });
  if (blankLayer) {
    layers.push(blankLayer);
  }
  return layers;
}
