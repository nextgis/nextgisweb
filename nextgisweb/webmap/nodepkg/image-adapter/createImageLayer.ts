import { getUid } from "ol/util";

import type { FilterExpressionString } from "@nextgisweb/feature-layer/feature-filter/type";
import { isAbortError } from "@nextgisweb/gui/error";
import { routeURL } from "@nextgisweb/pyramid/api";
import {
  imageQueue,
  tileLoadFunction,
  transparentImage,
} from "@nextgisweb/pyramid/util";
import Image from "@nextgisweb/webmap/ol/layer/Image";
import { renderStyleParams } from "@nextgisweb/webmap/utils/renderRequest";

import type { WebmapLayerOptions } from "../layer-adapter";
import type { CreateLayerOptions } from "../type/CreateLayerOptions";

interface QueryParams {
  resource: string;
  symbols?: string;
  filter?: FilterExpressionString;
  BBOX?: string;
  WIDTH?: string;
  HEIGHT?: string;
}

function parseQueryParams(queryString: string): QueryParams {
  const urlParams = new URLSearchParams(queryString);

  const params: QueryParams = {
    resource: urlParams.get("resource") || "",
    symbols: urlParams.get("symbols") || undefined,
    filter: (urlParams.get("filter") as FilterExpressionString) || undefined,
    BBOX: urlParams.get("BBOX") || undefined,
    WIDTH: urlParams.get("WIDTH") || undefined,
    HEIGHT: urlParams.get("HEIGHT") || undefined,
  };

  return params;
}

export function createImageLayer(
  item: CreateLayerOptions,
  options?: WebmapLayerOptions
) {
  const name =
    item.id !== undefined
      ? String(item.id)
      : Math.random().toString(36).slice(2);
  const layer = new Image(
    name,
    {
      maxResolution: item.maxResolution ?? undefined,
      minResolution: item.minResolution ?? undefined,
      visible: item.visibility,
      opacity: item.opacity ?? 1.0,
    },
    {
      url: routeURL("render.image"),
      params: {
        resource: item.styleId,
      },
      ratio: 1,
      crossOrigin: "anonymous",
      imageLoadFunction: function (imageTile, src) {
        const [url, query] = src.split("?");
        const queryObject = parseQueryParams(query);

        const resource = queryObject.resource;
        const symbolsParam = queryObject.symbols;
        const params = renderStyleParams(resource, {
          filter: queryObject.filter,
          symbols: symbolsParam === "-1" ? "-1" : symbolsParam?.split(","),
        });
        params.set("resource", resource);
        params.set("extent", String(queryObject.BBOX));
        params.set("size", queryObject.WIDTH + "," + queryObject.HEIGHT);
        params.set("nd", "204");
        const newSrc = url + "?" + params;

        const img = imageTile.getImage() as HTMLImageElement;
        const id = getUid(this);

        // Use a timeout to prevent the queue from aborting right after adding,
        // especially in cases with zoomToExtent.
        setTimeout(() => {
          imageQueue.add(
            ({ signal }) =>
              tileLoadFunction({
                src: newSrc,
                hmux: options?.hmux,
                cache: "no-cache",
                signal,
                sentryMetricOptions: {
                  component: COMP_ID,
                  baseUrl: location.origin,
                },
              })
                .then((imageUrl) => {
                  img.src = imageUrl;
                })
                .catch((error) => {
                  if (!isAbortError(error)) {
                    console.error(error);
                  }
                  img.src = transparentImage;
                }),
            { id }
          );
        });
      },
    }
  );

  return layer;
}
