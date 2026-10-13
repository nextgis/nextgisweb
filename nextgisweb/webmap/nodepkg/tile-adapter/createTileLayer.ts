import { tileLoadFunction, transparentImage } from "@nextgisweb/pyramid/util";
import XYZ from "@nextgisweb/webmap/ol/layer/XYZ";
import { renderTileUrl } from "@nextgisweb/webmap/utils/renderRequest";

import type { WebmapLayerOptions } from "../layer-adapter";
import type { CreateLayerOptions } from "../type/CreateLayerOptions";

export function createTileLayer(
  item: CreateLayerOptions,
  options?: WebmapLayerOptions
) {
  const name =
    item.id !== undefined
      ? String(item.id)
      : Math.random().toString(36).slice(2);
  const layer = new XYZ(
    name,
    {
      visible: item.visibility,
      maxResolution: item.maxResolution ?? undefined,
      minResolution: item.minResolution ?? undefined,
      opacity: item.opacity ?? 1.0,
    },
    {
      url: renderTileUrl(item.styleId, { nd: 204 }),
      crossOrigin: "anonymous",
      tileLoadFunction: (image, src) => {
        // @ts-expect-error Property 'getImage' does not exist on type 'Tile'.
        const img = image.getImage() as HTMLImageElement;

        tileLoadFunction({
          src,
          hmux: options?.hmux,
          sentryMetricOptions: {
            component: COMP_ID,
            baseUrl: location.origin,
          },
        })
          .then((imageUrl) => {
            img.src = imageUrl;
          })
          .catch(() => {
            img.src = transparentImage;
          });
      },
    }
  );

  return layer;
}
