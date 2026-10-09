import type Tile from "ol/Tile";
import TileState from "ol/TileState";
import type { Options as XYZSourceOptions } from "ol/source/XYZ";

import type MapLibreAdapter from "@nextgisweb/basemap/maplibre-adapter/MapLibreAdapter";
import { registerEPSG3395Projection } from "@nextgisweb/basemap/util/epsg3395";
import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { RequestQueue, tileLoadFunction } from "@nextgisweb/pyramid/util";
import type { TileLayerOptions } from "@nextgisweb/webmap/layer-adapter";

import type QuadKey from "./layer/QuadKey";
import type XYZ from "./layer/XYZ";

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

const exptyTileText = gettext("Unable to load tile");
function createEmptyTile(
  text = exptyTileText,
  width = 256,
  height = 256,
  textColor = "#808080"
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  return canvas.toDataURL("image/png");
}

export async function createURLLayer(
  options: TileLayerOptions
): Promise<QuadKey | XYZ | MapLibreAdapter | undefined> {
  const {
    source,
    layer: layerOptions,
    name = `basemap_${idx++}`,
    copyrightText,
    copyrightUrl,
    type = "tms",
  } = options;
  const { request } = options;
  const controller = new AbortController();
  const sourceWithAttributions: XYZSourceOptions = {
    crossOrigin: "anonymous",
    ...source,
    attributions: buildAttributionHtml(copyrightText, copyrightUrl),
  };

  if (source.projection === "EPSG:3395") {
    registerEPSG3395Projection();
  }

  if (!sourceWithAttributions.tileLoadFunction) {
    const emptyTile = request ? createEmptyTile() : undefined;
    sourceWithAttributions.tileLoadFunction = (tile: Tile, src: string) => {
      // @ts-expect-error Property 'getImage' does not exist on type 'Tile'.
      const img = tile.getImage() as HTMLImageElement;
      const setError = () => {
        // Canceled requests must also release the OpenLayers tile queue.
        if (tile.getState() === TileState.LOADING) {
          tile.setState(TileState.ERROR);
        }
      };
      if (request) {
        tileLoadFunction({ src, ...request, signal: controller.signal })
          .then((imageUrl) => {
            if (controller.signal.aborted) setError();
            else img.src = imageUrl;
          })
          .catch(() => {
            if (!controller.signal.aborted && emptyTile) img.src = emptyTile;
            else setError();
          });
      } else {
        basemapTileQueue.add(
          ({ signal }) =>
            tileLoadFunction({
              src,
              signal: AbortSignal.any([signal, controller.signal]),
              sentryMetricOptions: { component: "basemap", baseUrl: undefined },
            })
              .then((imageUrl) => {
                if (!signal.aborted && !controller.signal.aborted) {
                  img.src = imageUrl;
                } else {
                  setError();
                }
              })
              .catch(setError),
          { abort: setError }
        );
      }
    };
  }

  try {
    let layer: QuadKey | XYZ | MapLibreAdapter;
    if (type === "vector_tiles") {
      if (!source.url) throw new Error("MapLibre style URL is required");
      const { default: MapLibreAdapter } =
        await import("@nextgisweb/basemap/maplibre-adapter/MapLibreAdapter");
      layer = new MapLibreAdapter(name, layerOptions, {
        url: source.url,
        attributions: sourceWithAttributions.attributions,
      });
    } else {
      const MID = sourceWithAttributions.url?.includes("{q}")
        ? (await import("./layer/QuadKey")).default
        : (await import("./layer/XYZ")).default;
      layer = new MID(name, layerOptions, sourceWithAttributions);
    }

    if ("isBaseLayer" in options && options.isBaseLayer) {
      layer.isBaseLayer = true;
    }
    const dispose = layer.dispose.bind(layer);
    layer.dispose = () => {
      controller.abort();
      dispose();
    };
    return layer;
  } catch (err) {
    controller.abort();
    console.warn(`Can't initialize layer [${name}]: ${err}`);
  }
}
