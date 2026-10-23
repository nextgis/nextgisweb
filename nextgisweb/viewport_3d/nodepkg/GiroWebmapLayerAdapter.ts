import type Instance from "@giro3d/giro3d/core/Instance";
import TiledImageSource from "@giro3d/giro3d/sources/TiledImageSource";
import HttpConfiguration from "@giro3d/giro3d/utils/HttpConfiguration";
import XYZ from "ol/source/XYZ";

import type { FilterExpressionString } from "@nextgisweb/feature-layer/feature-filter/type";
import { routeURL } from "@nextgisweb/pyramid/api";
import type { LayerSymbols } from "@nextgisweb/webmap/compat/type";
import type { WebmapLayerAdapter } from "@nextgisweb/webmap/layer-adapter";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";
import { renderTileUrl } from "@nextgisweb/webmap/utils/renderRequest";

import { GiroLayerAdapter } from "./GiroLayerAdapter";
import { imageFormat } from "./imageFormat";

HttpConfiguration.setOptions(
  new URL(routeURL("render.tile"), location.href).href + "?",
  { cache: "force-cache" }
);

export class GiroWebmapLayerAdapter
  extends GiroLayerAdapter
  implements WebmapLayerAdapter
{
  private filter: FilterExpressionString | null = null;
  private symbols: LayerSymbols = [];
  private visible: boolean;

  constructor(
    instance: Instance,
    item: LayerItemConfig,
    onOrderChange: () => void
  ) {
    // Giro3D retains this function, so it must read the current render parameters.
    const source = new TiledImageSource({
      format: imageFormat,
      source: new XYZ({
        tileUrlFunction: ([z, x, y]) => {
          const url = renderTileUrl(item.styleId, {
            filter: this.filter,
            symbols: this.symbols,
          })
            .replace("{z}", String(z))
            .replace("{x}", String(x))
            .replace("{y}", String(y));
          return new URL(url, location.href).href;
        },
      }),
    });
    super(
      instance,
      {
        name: String(item.id),
        title: item.title,
        visible: item.visibility,
        opacity: item.opacity ?? 1,
      },
      source,
      onOrderChange
    );
    this.visible = item.visibility;
  }

  override setVisibility(visible: boolean): void {
    this.visible = visible;
    super.setVisibility(visible && this.symbols !== "-1");
  }

  setSymbols(symbols: LayerSymbols): void {
    this.symbols = symbols;
    this.setVisibility(this.visible);
    super.reload();
  }

  setFilter(filter: FilterExpressionString | null): void {
    if (filter === this.filter) return;
    this.filter = filter;
    super.reload();
  }

  setResolutionRange(_min: number | null, _max: number | null): void {
    // Scale-dependent visibility is handled by WebmapLayers.
  }
}
