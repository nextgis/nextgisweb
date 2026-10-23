import ImageLayer from "ol/layer/Image";
import ImageWMS from "ol/source/ImageWMS";
import { getUid } from "ol/util";

import { isAbortError } from "@nextgisweb/gui/error";
import {
  imageQueue,
  tileLoadFunction,
  transparentImage,
} from "@nextgisweb/pyramid/util";
import type { ImageLayerOptions } from "@nextgisweb/webmap/layer-adapter";

import { createNativeLayerAdapter } from "./createLayer";

export function createImageLayer(options: ImageLayerOptions) {
  const source = new ImageWMS({
    url: options.source.url,
    projection: options.source.projection,
    ratio: 1,
    crossOrigin: "anonymous",
    imageLoadFunction(imageTile, src) {
      const params = new URL(src, location.href).searchParams;
      const url = options.source.url
        .replace("{bbox}", params.get("BBOX") ?? "")
        .replace("{width}", params.get("WIDTH") ?? "")
        .replace("{height}", params.get("HEIGHT") ?? "");
      const img = imageTile.getImage() as HTMLImageElement;
      const id = getUid(this);

      // Use a timeout to prevent the queue from aborting right after adding,
      // especially in cases with zoomToExtent.
      setTimeout(() => {
        imageQueue.add(
          ({ signal }) =>
            tileLoadFunction({
              src: url,
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
  });
  return createNativeLayerAdapter(new ImageLayer({ source }), options);
}
